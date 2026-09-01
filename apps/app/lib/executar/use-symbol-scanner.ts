"use client";

/**
 * Laço de amostragem da câmera para reconhecimento de símbolo (Entrada,
 * Copiloto, Seletor, Feito, Saída) — roda em paralelo ao decode de QR
 * (`qr-scanner`, em `scanner-client.tsx`), lendo o mesmo `<video>` por um
 * `<canvas>` próprio, sem interferir um no outro.
 *
 * O reconhecimento usa múltiplas escalas centrais para isolar o ícone do
 * cartão físico e ignorar borda/rótulo ao redor; isso reduz a dependência de
 * enquadramento pixel a pixel e mantém a resposta dentro do orçamento de 3s.
 */

import { type RefObject, useEffect, useRef } from "react";
import type { AcaoScannerId } from "./mapa-os-projection.ts";
import {
  RASTER_SIZE_RECONHECIMENTO,
  reconhecerSimbolo,
} from "./symbol-recognizer.ts";

const INTERVALO_AMOSTRAGEM_MS = 80;
const QUADROS_ESTAVEIS_PARA_DISPARAR = 2;
const FRACOES_ROI_DO_VIDEO = [0.18, 0.22, 0.26, 0.3] as const;

type ResultadoSimbolo = ReturnType<typeof reconhecerSimbolo>;

interface UseSymbolScannerOptions {
  readonly ativo: boolean;
  readonly onReconhecido: (id: AcaoScannerId, latencyMs: number) => void;
  readonly videoRef: RefObject<HTMLVideoElement | null>;
}

interface RastreamentoSimbolo {
  disparadoParaAtual: boolean;
  exposicaoInicio: number;
  streak: number;
  ultimoId: AcaoScannerId | null;
}

function capturarEscala(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  fracao: number
): ResultadoSimbolo {
  const menorLado = Math.min(video.videoWidth, video.videoHeight);
  const lado = menorLado * fracao;
  const sx = (video.videoWidth - lado) / 2;
  const sy = (video.videoHeight - lado) / 2;

  ctx.clearRect(
    0,
    0,
    RASTER_SIZE_RECONHECIMENTO,
    RASTER_SIZE_RECONHECIMENTO
  );
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

  return reconhecerSimbolo(
    ctx.getImageData(
      0,
      0,
      RASTER_SIZE_RECONHECIMENTO,
      RASTER_SIZE_RECONHECIMENTO
    )
  );
}

function melhorResultadoDoFrame(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D
): ResultadoSimbolo {
  let melhor: ResultadoSimbolo = null;

  for (const fracao of FRACOES_ROI_DO_VIDEO) {
    const atual = capturarEscala(video, ctx, fracao);
    if (atual && (!melhor || atual.distancia < melhor.distancia)) {
      melhor = atual;
    }
  }

  return melhor;
}

function zerarRastreamento(rastreamento: RastreamentoSimbolo) {
  rastreamento.ultimoId = null;
  rastreamento.streak = 0;
  rastreamento.disparadoParaAtual = false;
  rastreamento.exposicaoInicio = 0;
}

function registrarResultado(
  resultado: NonNullable<ResultadoSimbolo>,
  rastreamento: RastreamentoSimbolo
) {
  if (resultado.id === rastreamento.ultimoId) {
    rastreamento.streak += 1;
    return;
  }

  rastreamento.ultimoId = resultado.id;
  rastreamento.streak = 1;
  rastreamento.disparadoParaAtual = false;
  rastreamento.exposicaoInicio = performance.now();
}

function deveDisparar(rastreamento: RastreamentoSimbolo): boolean {
  return (
    rastreamento.streak >= QUADROS_ESTAVEIS_PARA_DISPARAR &&
    !rastreamento.disparadoParaAtual
  );
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

    const rastreamento: RastreamentoSimbolo = {
      disparadoParaAtual: false,
      exposicaoInicio: 0,
      streak: 0,
      ultimoId: null,
    };

    const amostrar = () => {
      if (video.readyState < video.HAVE_CURRENT_DATA || !video.videoWidth) {
        return;
      }

      const resultado = melhorResultadoDoFrame(video, ctx);
      if (!resultado) {
        zerarRastreamento(rastreamento);
        return;
      }

      registrarResultado(resultado, rastreamento);
      if (!deveDisparar(rastreamento)) {
        return;
      }

      rastreamento.disparadoParaAtual = true;
      onReconhecidoRef.current(
        resultado.id,
        Math.round(performance.now() - rastreamento.exposicaoInicio)
      );
    };

    const intervalo = window.setInterval(amostrar, INTERVALO_AMOSTRAGEM_MS);
    return () => window.clearInterval(intervalo);
  }, [ativo, videoRef]);
}
