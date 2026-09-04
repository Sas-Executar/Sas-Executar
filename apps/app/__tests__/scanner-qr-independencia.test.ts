import type { RecognitionResult } from "@repo/executar-contracts/scanner";
import { describe, expect, it, vi } from "vitest";
import type { Entrega, EstadoOperacional } from "@/lib/executar/domain";
import { entregasAtivas, novoEstado } from "@/lib/executar/domain";
import { despacharComando } from "@/lib/executar/scanner-engine/command-dispatcher";
import {
  criarConsensusEngine,
  processarReconhecimento,
} from "@/lib/executar/scanner-engine/recognition-consensus";
import { criarScannerEngine } from "@/lib/executar/scanner-engine/scanner-engine";

/**
 * Prova de independência de QR — PR-11, a última do plano "Scanner
 * OCR-first V2": o pipeline OCR-first (`scanner-engine/`, PR-02 a PR-10)
 * resolve os 5 comandos administrativos (ENTRADA/COPILOTO/SELETOR/FEITO/
 * SAIDA) sem NUNCA importar `qr-scanner`. Este mock lança se qualquer
 * módulo do caminho abaixo tentar importar `qr-scanner` — o teste prova
 * que isso nunca acontece, disparando os 5 comandos via `RecognitionResult`
 * (só produzido pelo resolver OCR, PR-05 — nunca por QR) através da MESMA
 * cadeia real que `scanner-client.tsx` usa em produção: engine → consenso
 * → command dispatcher → domínio.
 *
 * QR continua existindo no Scanner (`scanner-client.tsx`, `<QrScanner>`)
 * — só para os payloads que o vocabulário fechado dos 5 comandos nunca
 * cobriu: links de tarefa/documento e atalhos de destino
 * (`resolverPayloadScanner`, kinds "tarefa"/"destino"/"qr_jump"), nunca
 * para os 5 comandos administrativos, que este teste prova resolvidos
 * inteiramente pelo caminho OCR. Ver `tests/fixtures/scanner/README.md`
 * ("Independência de QR") para o resumo completo do plano.
 */
vi.mock("qr-scanner", () => ({
  default: class {
    constructor() {
      throw new Error(
        "qr-scanner não deveria ser importado pelo pipeline OCR-first (scanner-engine/)"
      );
    }
  },
}));

const ORG_ID = "org-qr-independencia";

const SEQUENCIA_COMANDOS: readonly RecognitionResult["actionId"][] = [
  "entrada",
  "copiloto",
  "seletor",
  "feito",
  "saida",
];

function tarefa(overrides: Partial<Entrega> & { id: string }): Entrega {
  return {
    date: "04/09",
    deps: [],
    front: "principal",
    mins: 30,
    stage: 1,
    title: "Tarefa sem título definido",
    ...overrides,
  };
}

function reconhecimento(
  actionId: RecognitionResult["actionId"]
): RecognitionResult {
  return {
    actionId,
    capturedAt: 0,
    confidence: 95,
    normalizedText: actionId.toUpperCase(),
    rawText: actionId.toUpperCase(),
    recognitionEndedAt: 50,
    recognitionLatencyMs: 50,
    recognitionStartedAt: 0,
  };
}

describe("independência de QR — os 5 comandos administrativos via OCR-first", () => {
  it("despacha os 5 comandos numa sessão contínua (entrada→copiloto→seletor→feito→saida) sem tocar em qr-scanner", () => {
    const tasks: Entrega[] = [tarefa({ id: "t1", title: "Alvo" })];
    let state: EstadoOperacional = novoEstado(ORG_ID, tasks);

    const engine = criarScannerEngine();
    const consensus = criarConsensusEngine();
    engine.start();
    engine.notifyWorkerReady();

    const comandosDespachados: string[] = [];

    for (const actionId of SEQUENCIA_COMANDOS) {
      engine.notifyRecognitionStarted();

      const decisao = processarReconhecimento(
        engine,
        consensus,
        reconhecimento(actionId)
      );
      expect(decisao).toBe("confirmar");
      expect(engine.getSnapshot().state).toBe("locked");

      const recognition = engine.getSnapshot().lastRecognition;
      expect(recognition).not.toBeNull();

      const comando = despacharComando(
        // biome-ignore lint/style/noNonNullAssertion: verificado na linha acima.
        recognition!,
        entregasAtivas(state),
        state
      );
      comandosDespachados.push(comando.kind);

      if (comando.kind === "entrada" || comando.kind === "feito") {
        state = comando.stateResultante;
      }

      // Token "saiu da ROI" — arma o engine de novo pro próximo comando,
      // igual ao observador de lock-clear real faria (command-dispatcher.ts).
      engine.notifyLockCleared();
    }

    expect(comandosDespachados).toEqual([
      "entrada",
      "copiloto",
      "seletor",
      "feito",
      "saida",
    ]);
    expect(state.done).toContain("t1");
  });
});
