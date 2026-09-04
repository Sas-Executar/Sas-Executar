"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { criarObservadorLockClear } from "./command-dispatcher";
import { avaliarQualidadeFrame, possuiForegroundMinimo } from "./frame-quality";
import { criarFrameSource } from "./frame-source";
import {
  confiancaSuficiente,
  iniciarOcrWorker,
  type OcrWorkerHandle,
} from "./ocr-worker";
import {
  criarConsensusEngine,
  processarReconhecimento,
} from "./recognition-consensus";
import { construirRecognitionResult } from "./recognition-resolver";
import { desenharRoiEmContexto, LADO_CANVAS_OCR } from "./roi-preprocessor";
import { criarScannerEngine, type ScannerEngine } from "./scanner-engine";
import { estaTravado, podeReconhecer } from "./scanner-state-machine";
import type { ScannerEngineSnapshot } from "./types";

/**
 * `useScannerEngine` — PR-07 do plano "Scanner OCR-first V2" (handoff
 * §"ScannerClient Adapter"): a única ponte entre React e o pipeline
 * CAMERA → FRAME SOURCE → QUALITY GATE → ROI → OCR → RESOLVER → CONSENSUS
 * (PR-02 a PR-05). Substitui `useSymbolScanner` (reconhecimento por forma)
 * e `useTesseractSymbolScanner` (OCR ad hoc, um `setInterval` próprio) —
 * este hook é o ÚNICO consumidor do `<video>` para o caminho OCR/símbolos.
 *
 * QR continua fora deste hook, deliberadamente: `qr-scanner` mantém seu
 * próprio laço de decodificação sobre o mesmo `<video>`, um "segundo
 * consumidor de câmera" que a unificação total do handoff (§"frame-
 * source.ts") ainda não cobre — decisão documentada também em
 * `scanner-client.tsx`. QR entra na análise de independência só na PR-11;
 * juntar os dois laços de captura é um passo maior demais para empacotar
 * nesta PR sem medir o risco de regressão no caminho já em produção.
 *
 * Escopo: só a etapa de RECONHECIMENTO. Despachar a ação confirmada pro
 * domínio é responsabilidade do chamador (`command-dispatcher.ts`,
 * PR-06) — observe `snapshot.lastRecognition` mudar enquanto
 * `snapshot.state === "locked"` e chame `despacharComando` a partir daí.
 * O ACTION LOCK é destravado automaticamente por este hook assim que o
 * token física sair da ROI (via `criarObservadorLockClear`, PR-06) — o
 * chamador não precisa (nem deve) chamar `notifyLockCleared()` por conta
 * própria.
 */

const INTERVALO_RECONHECIMENTO_MS = 620;

export interface UseScannerEngineOptions {
  readonly ativo: boolean;
  readonly intervalMs?: number;
  readonly videoRef: RefObject<HTMLVideoElement | null>;
}

export interface UseScannerEngineResult {
  /** Tenta reaquecer o worker OCR depois de `unavailable` (novo worker + `engine.retry()`). */
  retry(): void;
  readonly snapshot: ScannerEngineSnapshot;
}

export function useScannerEngine({
  ativo,
  intervalMs = INTERVALO_RECONHECIMENTO_MS,
  videoRef,
}: UseScannerEngineOptions): UseScannerEngineResult {
  const engineRef = useRef<ScannerEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = criarScannerEngine();
  }
  const engine = engineRef.current;

  const [snapshot, setSnapshot] = useState<ScannerEngineSnapshot>(() =>
    engine.getSnapshot()
  );

  const workerRef = useRef<OcrWorkerHandle | null>(null);
  const consensusRef = useRef(criarConsensusEngine());
  const lockObserverRef = useRef(criarObservadorLockClear(engine));
  const frameAnteriorRef = useRef<Uint8ClampedArray | null>(null);
  const reconhecendoRef = useRef(false);
  const bootstrapWorkerRef = useRef<() => void>(() => undefined);

  useEffect(() => engine.subscribe(setSnapshot), [engine]);

  // Ciclo de vida do worker OCR — aquecido assim que `ativo` liga, uma
  // única vez (handoff §4: worker pronto ANTES da câmera precisar dele).
  useEffect(() => {
    if (!ativo) {
      engine.stop();
      return;
    }

    engine.start();
    let cancelado = false;

    function bootstrap() {
      iniciarOcrWorker(engine).then((handle) => {
        if (cancelado) {
          handle?.terminate();
          return;
        }
        workerRef.current = handle;
      });
    }

    bootstrapWorkerRef.current = bootstrap;
    bootstrap();

    return () => {
      cancelado = true;
      engine.stop();
      workerRef.current?.terminate();
      workerRef.current = null;
      consensusRef.current.reset();
      lockObserverRef.current.reset();
      frameAnteriorRef.current = null;
    };
  }, [ativo, engine]);

  // Fonte única de frames para este pipeline — captura a ROI, roda o gate
  // de qualidade, e só chama o worker OCR quando o engine está `ready`.
  useEffect(() => {
    if (!ativo) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = LADO_CANVAS_OCR;
    canvas.height = LADO_CANVAS_OCR;
    const contexto = canvas.getContext("2d", { willReadFrequently: true });

    if (!contexto) {
      return;
    }

    function processarFrame(imageData: ImageData) {
      const snapshotAtual = engine.getSnapshot();

      // Trancado: só observa se o token já saiu da ROI (destrava sozinho).
      if (estaTravado(snapshotAtual.state)) {
        lockObserverRef.current.notificarPresenca(
          possuiForegroundMinimo(imageData.data)
        );
        return;
      }

      const avaliacao = avaliarQualidadeFrame(
        imageData.data,
        frameAnteriorRef.current
      );
      frameAnteriorRef.current = imageData.data;

      if (
        !(
          avaliacao.ok &&
          podeReconhecer(snapshotAtual.state) &&
          workerRef.current &&
          !reconhecendoRef.current
        )
      ) {
        return;
      }

      const worker = workerRef.current;
      reconhecendoRef.current = true;
      engine.notifyRecognitionStarted();
      const capturedAt = Date.now();

      worker
        .recognize(canvas)
        .then((outcome) => {
          if (!confiancaSuficiente(outcome.confidence)) {
            engine.notifyRecognitionInconclusive();
            return;
          }

          const resultado = construirRecognitionResult(outcome, capturedAt);

          if (!resultado) {
            engine.notifyRecognitionInconclusive();
            return;
          }

          processarReconhecimento(engine, consensusRef.current, resultado);
        })
        .catch(() => {
          engine.notifyWorkerUnavailable();
        })
        .finally(() => {
          reconhecendoRef.current = false;
        });
    }

    const frameSource = criarFrameSource<ImageData>({
      capturarFrame: () => {
        const video = videoRef.current;

        if (!(video && desenharRoiEmContexto(video, contexto))) {
          return null;
        }

        return contexto.getImageData(0, 0, LADO_CANVAS_OCR, LADO_CANVAS_OCR);
      },
      intervalMs,
    });

    const unsubscribe = frameSource.subscribe(processarFrame);
    frameSource.start();

    return () => {
      unsubscribe();
      frameSource.stop();
    };
  }, [ativo, engine, intervalMs, videoRef]);

  return {
    retry() {
      engine.retry();
      bootstrapWorkerRef.current();
    },
    snapshot,
  };
}
