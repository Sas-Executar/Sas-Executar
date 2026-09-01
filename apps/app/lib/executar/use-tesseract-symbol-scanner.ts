"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import type { Worker } from "tesseract.js";
import type { AcaoScannerId } from "./mapa-os-projection.ts";
import { CARACTERES_OCR_SCANNER, resolverTextoScanner } from "./scanner-ocr.ts";

const INTERVALO_OCR_MS = 620;
const FRACAO_ROI_OCR = 0.82;
const CONFIANCA_MINIMA = 58;

export type EstadoTesseract = "carregando" | "indisponivel" | "pronto";

interface ResultadoOcrScanner {
  readonly confianca: number;
  readonly id: AcaoScannerId;
  readonly latencyMs: number;
  readonly texto: string;
}

interface UseTesseractSymbolScannerOptions {
  readonly ativo: boolean;
  readonly onReconhecido: (resultado: ResultadoOcrScanner) => void;
  readonly videoRef: RefObject<HTMLVideoElement | null>;
}

function capturarRoi(video: HTMLVideoElement): HTMLCanvasElement | null {
  if (video.readyState < video.HAVE_CURRENT_DATA || !video.videoWidth) {
    return null;
  }

  const lado = Math.min(video.videoWidth, video.videoHeight) * FRACAO_ROI_OCR;
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 320;
  const contexto = canvas.getContext("2d", { willReadFrequently: true });

  if (!contexto) {
    return null;
  }

  contexto.filter = "grayscale(1) contrast(1.65)";
  contexto.drawImage(
    video,
    (video.videoWidth - lado) / 2,
    (video.videoHeight - lado) / 2,
    lado,
    lado,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas;
}

export function useTesseractSymbolScanner({
  ativo,
  onReconhecido,
  videoRef,
}: UseTesseractSymbolScannerOptions): EstadoTesseract {
  const [estado, setEstado] = useState<EstadoTesseract>("carregando");
  const workerRef = useRef<Worker | null>(null);
  const onReconhecidoRef = useRef(onReconhecido);

  useEffect(() => {
    onReconhecidoRef.current = onReconhecido;
  });

  useEffect(() => {
    let cancelado = false;

    async function prepararWorker() {
      try {
        const { createWorker, OEM, PSM } = await import("tesseract.js");
        const worker = await createWorker("eng", OEM.LSTM_ONLY);
        await worker.setParameters({
          preserve_interword_spaces: "0",
          tessedit_char_whitelist: CARACTERES_OCR_SCANNER,
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          user_defined_dpi: "300",
        });

        if (cancelado) {
          await worker.terminate();
          return;
        }

        workerRef.current = worker;
        setEstado("pronto");
      } catch {
        if (!cancelado) {
          setEstado("indisponivel");
        }
      }
    }

    prepararWorker();

    return () => {
      cancelado = true;
      const worker = workerRef.current;
      workerRef.current = null;
      worker?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!(ativo && estado === "pronto")) {
      return;
    }

    let processando = false;
    let cancelado = false;

    async function reconhecer() {
      const worker = workerRef.current;
      const video = videoRef.current;

      if (processando || !worker || !video) {
        return;
      }

      const roi = capturarRoi(video);
      if (!roi) {
        return;
      }

      processando = true;
      const inicio = performance.now();

      try {
        const resultado = await worker.recognize(roi);
        const id = resolverTextoScanner(resultado.data.text);

        if (!cancelado && id && resultado.data.confidence >= CONFIANCA_MINIMA) {
          onReconhecidoRef.current({
            confianca: resultado.data.confidence,
            id,
            latencyMs: Math.round(performance.now() - inicio),
            texto: resultado.data.text.trim(),
          });
        }
      } catch {
        if (!cancelado) {
          setEstado("indisponivel");
        }
      } finally {
        processando = false;
      }
    }

    const intervalo = window.setInterval(reconhecer, INTERVALO_OCR_MS);
    reconhecer();
    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, [ativo, estado, videoRef]);

  return estado;
}
