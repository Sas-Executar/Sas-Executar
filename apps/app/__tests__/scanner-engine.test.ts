import type { RecognitionResult } from "@repo/executar-contracts/scanner";
import { describe, expect, it } from "vitest";
import { criarScannerEngine } from "@/lib/executar/scanner-engine/scanner-engine";
import type { ScannerEngineSnapshot } from "@/lib/executar/scanner-engine/types";

function resultado(
  overrides: Partial<RecognitionResult> = {}
): RecognitionResult {
  return {
    actionId: "feito",
    capturedAt: 0,
    confidence: 90,
    normalizedText: "FEITO",
    rawText: "FEITO",
    recognitionEndedAt: 200,
    recognitionLatencyMs: 200,
    recognitionStartedAt: 0,
    ...overrides,
  };
}

describe("criarScannerEngine", () => {
  it("começa idle, sem reconhecimento e com métricas zeradas", () => {
    const engine = criarScannerEngine();
    const snapshot = engine.getSnapshot();

    expect(snapshot.state).toBe("idle");
    expect(snapshot.lastRecognition).toBeNull();
    expect(snapshot.metrics).toEqual({
      actionsDispatched: 0,
      recognitionAttempts: 0,
      recognitionsInconclusive: 0,
      workerFailures: 0,
    });
  });

  it("percorre o ciclo completo e acumula métricas corretamente", () => {
    const engine = criarScannerEngine();

    engine.start();
    engine.notifyWorkerReady();
    engine.notifyRecognitionStarted();
    engine.notifyRecognitionInconclusive();
    engine.notifyRecognitionStarted();
    engine.notifyRecognitionResolved(resultado());

    const snapshot = engine.getSnapshot();
    expect(snapshot.state).toBe("locked");
    expect(snapshot.lastRecognition?.actionId).toBe("feito");
    expect(snapshot.metrics).toEqual({
      actionsDispatched: 1,
      recognitionAttempts: 2,
      recognitionsInconclusive: 1,
      workerFailures: 0,
    });

    engine.notifyLockCleared();
    expect(engine.getSnapshot().state).toBe("ready");
  });

  it("stop() reseta métricas e último reconhecimento — sessão nova", () => {
    const engine = criarScannerEngine();
    engine.start();
    engine.notifyWorkerReady();
    engine.notifyRecognitionStarted();
    engine.notifyRecognitionResolved(resultado());

    engine.stop();
    const snapshot = engine.getSnapshot();

    expect(snapshot.state).toBe("idle");
    expect(snapshot.lastRecognition).toBeNull();
    expect(snapshot.metrics.actionsDispatched).toBe(0);
  });

  it("retry() a partir de unavailable volta para warming", () => {
    const engine = criarScannerEngine();
    engine.start();
    engine.notifyWorkerUnavailable();
    expect(engine.getSnapshot().state).toBe("unavailable");
    expect(engine.getSnapshot().metrics.workerFailures).toBe(1);

    engine.retry();
    expect(engine.getSnapshot().state).toBe("warming");
  });

  it("notifica os assinantes mesmo quando só as métricas mudam sem trocar de estado", () => {
    const engine = criarScannerEngine();
    engine.start();
    engine.notifyWorkerUnavailable();

    const snapshots: ScannerEngineSnapshot[] = [];
    const unsubscribe = engine.subscribe((snapshot) =>
      snapshots.push(snapshot)
    );

    // Já está "unavailable": uma segunda falha não muda de estado, mas o
    // contador de falhas ainda deve avançar e o assinante deve ser avisado.
    engine.notifyWorkerUnavailable();

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].state).toBe("unavailable");
    expect(snapshots[0].metrics.workerFailures).toBe(2);

    unsubscribe();
    engine.notifyWorkerUnavailable();
    expect(snapshots).toHaveLength(1);
  });
});
