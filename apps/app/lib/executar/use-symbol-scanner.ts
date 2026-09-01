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

      const menorLado = Math.min(video.videoWidth, video.videoHeight);
      let melhorResultado: ReturnType<typeof reconhecerSimbolo> = null;

      for (const fracao of FRACOES_ROI_DO_VIDEO) {
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

        const imagem = ctx.getImageData(
          0,
          0,
          RASTER_SIZE_RECONHECIMENTO,
          RASTER_SIZE_RECONHECIMENTO
        );
        const resultado = reconhecerSimbolo(imagem);

        if (
          resultado &&
          (!melhorResultado || resultado.distancia < melhorResultado.distancia)
        ) {
          melhorResultado = resultado;
        }
      }

      if (!melhorResultado) {
        ultimoId = null;
        streak = 0;
        disparadoParaAtual = false;
        exposicaoInicio = 0;
        return;
      }

      if (melhorResultado.id === ultimoId) {
        streak += 1;
      } else {
        ultimoId = melhorResultado.id;
        streak = 1;
        disparadoParaAtual = false;
        exposicaoInicio = performance.now();
      }

      if (streak >= QUADROS_ESTAVEIS_PARA_DISPARAR && !disparadoParaAtual) {
        disparadoParaAtual = true;
        onReconhecidoRef.current(
          melhorResultado.id,
          Math.round(performance.now() - exposicaoInicio)
        );
      }
    };

    const intervalo = window.setInterval(amostrar, INTERVALO_AMOSTRAGEM_MS);
    return () => window.clearInterval(intervalo);
  }, [ativo, videoRef]);
}
