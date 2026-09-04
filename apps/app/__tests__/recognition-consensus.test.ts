import type { RecognitionResult } from "@repo/executar-contracts/scanner";
import { describe, expect, it } from "vitest";
import {
  criarConsensusEngine,
  processarReconhecimento,
} from "@/lib/executar/scanner-engine/recognition-consensus";
import { criarScannerEngine } from "@/lib/executar/scanner-engine/scanner-engine";

function leitura(
  overrides: Partial<RecognitionResult> = {}
): RecognitionResult {
  return {
    actionId: "feito",
    capturedAt: 0,
    confidence: 60,
    normalizedText: "FEITO",
    rawText: "FEITO",
    recognitionEndedAt: 100,
    recognitionLatencyMs: 100,
    recognitionStartedAt: 0,
    ...overrides,
  };
}

describe("criarConsensusEngine", () => {
  it("confirma imediatamente quando a confiança é muito alta", () => {
    const consensus = criarConsensusEngine();
    expect(consensus.avaliar(leitura({ confidence: 90 }))).toBe("confirmar");
  });

  it("aguarda na primeira leitura de confiança moderada", () => {
    const consensus = criarConsensusEngine();
    expect(consensus.avaliar(leitura({ confidence: 60 }))).toBe("aguardar");
  });

  it("confirma na segunda leitura consecutiva igual", () => {
    const consensus = criarConsensusEngine();
    consensus.avaliar(leitura({ actionId: "feito", confidence: 60 }));
    expect(
      consensus.avaliar(leitura({ actionId: "feito", confidence: 60 }))
    ).toBe("confirmar");
  });

  it("reinicia a sequência quando a ação lida muda", () => {
    const consensus = criarConsensusEngine();
    consensus.avaliar(leitura({ actionId: "feito", confidence: 60 }));
    expect(
      consensus.avaliar(leitura({ actionId: "saida", confidence: 60 }))
    ).toBe("aguardar");
    // precisa de mais uma leitura de "saida" pra confirmar, não uma só.
    expect(
      consensus.avaliar(leitura({ actionId: "saida", confidence: 60 }))
    ).toBe("confirmar");
  });

  it("reset() limpa a sequência acumulada", () => {
    const consensus = criarConsensusEngine();
    consensus.avaliar(leitura({ actionId: "feito", confidence: 60 }));
    consensus.reset();
    expect(
      consensus.avaliar(leitura({ actionId: "feito", confidence: 60 }))
    ).toBe("aguardar");
  });

  it("respeita limites customizados", () => {
    const consensus = criarConsensusEngine({
      confiancaAltaMinima: 99,
      leiturasConsecutivasNecessarias: 3,
    });
    expect(consensus.avaliar(leitura({ confidence: 95 }))).toBe("aguardar");
    expect(consensus.avaliar(leitura({ confidence: 95 }))).toBe("aguardar");
    expect(consensus.avaliar(leitura({ confidence: 95 }))).toBe("confirmar");
  });
});

describe("processarReconhecimento — integração com o ScannerEngine", () => {
  it("confirma → notifyRecognitionResolved → engine trava (ACTION LOCK)", () => {
    const engine = criarScannerEngine();
    const consensus = criarConsensusEngine();
    engine.start();
    engine.notifyWorkerReady();
    engine.notifyRecognitionStarted();

    const decisao = processarReconhecimento(
      engine,
      consensus,
      leitura({ confidence: 90 })
    );

    expect(decisao).toBe("confirmar");
    expect(engine.getSnapshot().state).toBe("locked");
    expect(engine.getSnapshot().lastRecognition?.actionId).toBe("feito");
  });

  it("aguardar → notifyRecognitionInconclusive → engine volta pra ready", () => {
    const engine = criarScannerEngine();
    const consensus = criarConsensusEngine();
    engine.start();
    engine.notifyWorkerReady();
    engine.notifyRecognitionStarted();

    const decisao = processarReconhecimento(
      engine,
      consensus,
      leitura({ confidence: 60 })
    );

    expect(decisao).toBe("aguardar");
    expect(engine.getSnapshot().state).toBe("ready");
    expect(engine.getSnapshot().metrics.recognitionsInconclusive).toBe(1);
  });

  it("reseta o consenso após confirmar, para a próxima sessão de exposição começar do zero", () => {
    const engine = criarScannerEngine();
    const consensus = criarConsensusEngine();
    engine.start();
    engine.notifyWorkerReady();

    engine.notifyRecognitionStarted();
    processarReconhecimento(engine, consensus, leitura({ confidence: 90 }));
    engine.notifyLockCleared();

    engine.notifyRecognitionStarted();
    // Sem o reset, esta segunda leitura moderada já teria "sequência 2" —
    // ela deve, na verdade, começar do zero e aguardar.
    const decisao = processarReconhecimento(
      engine,
      consensus,
      leitura({ confidence: 60 })
    );

    expect(decisao).toBe("aguardar");
  });
});
