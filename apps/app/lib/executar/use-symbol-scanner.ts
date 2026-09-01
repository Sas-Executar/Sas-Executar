"use client";

/**
 * Laço de amostragem da câmera para reconhecimento de símbolo (Entrada,
 * Copiloto, Seletor, Feito, Saída) — roda em paralelo ao decode de QR
 * (`qr-scanner`, em `scanner-client.tsx`), lendo o mesmo `<video>` por um
 * `<canvas>` próprio, sem interferir um no outro.
 *
 * "Tão instantâneo quanto um QR code, <3s": amostra a ROI central a ~11/s e
 * exige `QUADROS_ESTAVEIS_PARA_DISPARAR` leituras seguidas iguais antes de
 * disparar (~270ms de exposição estável) — suficiente para não reagir a um
 * ruído de 1 quadro, e uma ordem de grandeza abaixo do orçamento de 3s.
 * Dispara uma única vez por "sessão de exposição" do símbolo (precisa sair
 * de quadro e voltar para disparar de novo) — mesmo comportamento esperado
 * de aproximar/afastar um QR.
 */

import { type RefObject, useEffect, useRef } from "react";
import type { AcaoScannerId } from "./mapa-os-projection.ts";
import {
  RASTER_SIZE_RECONHECIMENTO,
  reconhecerSimbolo,
} from "./symbol-recognizer.ts";

const INTERVALO_AMOSTRAGEM_MS = 90;
const QUADROS_ESTAVEIS_PARA_DISPARAR = 3;
/** Recorte central quadrado — metade do menor lado do vídeo. */
const FRACAO_ROI_DO_VIDEO = 0.5;

interface UseSymbolScannerOptions {
  readonly ativo: boolean;
  readonly onReconhecido: (id: AcaoScannerId, latencyMs: number) => void;
  readonly videoRef: RefObject<HTMLVideoElement | null>;
}

export function useSymbolScanner({
  ativo,
  onReconhecido,
  videoRef,
}: UseSymbolScannerOptions) {
  const onReconhecidoRef = useRef(onReconhecido);

  useEffect(() => {
    onReconhecidoRef.current = onReconhecido;
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!(ativo && video)) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = RASTER_SIZE_RECONHECIMENTO;
    canvas.height = RASTER_SIZE_RECONHECIMENTO;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return;
    }

    let ultimoId: AcaoScannerId | null = null;
    let streak = 0;
    let disparadoParaAtual = false;
    let exposicaoInicio = 0;

    const amostrar = () => {
      if (video.readyState < video.HAVE_CURRENT_DATA || !video.videoWidth) {
        return;
      }

      const lado =
        Math.min(video.videoWidth, video.videoHeight) * FRACAO_ROI_DO_VIDEO;
      const sx = (video.videoWidth - lado) / 2;
      const sy = (video.videoHeight - lado) / 2;

      ctx.drawImage(
        video,
        sx,
        sy,
        lado,
        lado,
        0,
        0,
        RASTER_SIZE_RECONHECIMENTO,
        RASTER_SIZE_RECONHECIMENTO
      );
      const imagem = ctx.getImageData(
        0,
        0,
        RASTER_SIZE_RECONHECIMENTO,
        RASTER_SIZE_RECONHECIMENTO
      );
      const resultado = reconhecerSimbolo(imagem);

      if (!resultado) {
        ultimoId = null;
        streak = 0;
        disparadoParaAtual = false;
        exposicaoInicio = 0;
        return;
      }

      if (resultado.id === ultimoId) {
        streak += 1;
      } else {
        ultimoId = resultado.id;
        streak = 1;
        disparadoParaAtual = false;
        exposicaoInicio = performance.now();
      }

      if (streak >= QUADROS_ESTAVEIS_PARA_DISPARAR && !disparadoParaAtual) {
        disparadoParaAtual = true;
        onReconhecidoRef.current(
          resultado.id,
          Math.round(performance.now() - exposicaoInicio)
        );
      }
    };

    const intervalo = window.setInterval(amostrar, INTERVALO_AMOSTRAGEM_MS);
    return () => window.clearInterval(intervalo);
  }, [ativo, videoRef]);
}
