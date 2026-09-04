import { describe, expect, it } from "vitest";
import {
  estaTravado,
  podeReconhecer,
  transicionar,
} from "@/lib/executar/scanner-engine/scanner-state-machine";
import type { ScannerEngineState } from "@/lib/executar/scanner-engine/types";

const TODOS_OS_ESTADOS: readonly ScannerEngineState[] = [
  "idle",
  "warming",
  "ready",
  "recognizing",
  "locked",
  "unavailable",
];

describe("transicionar — ciclo de vida feliz", () => {
  it("percorre idle → warming → ready → recognizing → locked → ready", () => {
    let estado: ScannerEngineState = "idle";

    estado = transicionar(estado, { type: "START" });
    expect(estado).toBe("warming");

    estado = transicionar(estado, { type: "WORKER_READY" });
    expect(estado).toBe("ready");

    estado = transicionar(estado, { type: "RECOGNITION_STARTED" });
    expect(estado).toBe("recognizing");

    estado = transicionar(estado, {
      type: "RECOGNITION_RESOLVED",
      result: {
        actionId: "feito",
        capturedAt: 0,
        confidence: 95,
        normalizedText: "FEITO",
        rawText: "FEITO",
        recognitionEndedAt: 100,
        recognitionLatencyMs: 100,
        recognitionStartedAt: 0,
      },
    });
    expect(estado).toBe("locked");

    estado = transicionar(estado, { type: "LOCK_CLEARED" });
    expect(estado).toBe("ready");
  });

  it("volta para ready quando o reconhecimento é inconclusivo", () => {
    let estado: ScannerEngineState = "ready";
    estado = transicionar(estado, { type: "RECOGNITION_STARTED" });
    estado = transicionar(estado, { type: "RECOGNITION_INCONCLUSIVE" });
    expect(estado).toBe("ready");
  });
});

describe("transicionar — falhas e recuperação", () => {
  it("vai para unavailable a partir de warming, ready ou recognizing", () => {
    for (const origem of ["warming", "ready", "recognizing"] as const) {
      expect(transicionar(origem, { type: "WORKER_UNAVAILABLE" })).toBe(
        "unavailable"
      );
    }
  });

  it("RETRY reinicia o aquecimento a partir de unavailable", () => {
    expect(transicionar("unavailable", { type: "RETRY" })).toBe("warming");
  });

  it("STOP volta para idle de qualquer estado", () => {
    for (const origem of TODOS_OS_ESTADOS) {
      expect(transicionar(origem, { type: "STOP" })).toBe("idle");
    }
  });
});

describe("transicionar — eventos espúrios são ignorados", () => {
  it("não muda de estado para uma transição não prevista", () => {
    expect(transicionar("idle", { type: "WORKER_READY" })).toBe("idle");
    expect(transicionar("ready", { type: "START" })).toBe("ready");
    expect(transicionar("locked", { type: "RECOGNITION_STARTED" })).toBe(
      "locked"
    );
  });
});

describe("podeReconhecer / estaTravado", () => {
  it("só é true para 'ready' / 'locked' respectivamente", () => {
    for (const estado of TODOS_OS_ESTADOS) {
      expect(podeReconhecer(estado)).toBe(estado === "ready");
      expect(estaTravado(estado)).toBe(estado === "locked");
    }
  });
});
