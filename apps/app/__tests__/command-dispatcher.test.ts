import type { RecognitionResult } from "@repo/executar-contracts/scanner";
import { describe, expect, it, vi } from "vitest";
import type { Entrega, EstadoOperacional } from "@/lib/executar/domain";
import { novoEstado } from "@/lib/executar/domain";
import {
  type ComandoDespachado,
  criarObservadorLockClear,
  despacharComando,
} from "@/lib/executar/scanner-engine/command-dispatcher";

const ORG_ID = "org-dispatcher";

function tarefa(overrides: Partial<Entrega> & { id: string }): Entrega {
  return {
    date: "28/08",
    deps: [],
    front: "principal",
    mins: 30,
    stage: 1,
    title: "Tarefa sem título definido",
    ...overrides,
  };
}

function estadoCom(tasks: readonly Entrega[]): EstadoOperacional {
  return novoEstado(ORG_ID, tasks);
}

function reconhecimento(
  overrides: Partial<RecognitionResult> = {}
): RecognitionResult {
  return {
    actionId: "entrada",
    capturedAt: 0,
    confidence: 90,
    normalizedText: "ENTRADA",
    rawText: "ENTRADA",
    recognitionEndedAt: 100,
    recognitionLatencyMs: 100,
    recognitionStartedAt: 0,
    ...overrides,
  };
}

describe("despacharComando", () => {
  it("entrada: assume foco na primeira tarefa liberada", () => {
    const tasks = [tarefa({ id: "t1", title: "Primeira" })];
    const state = estadoCom(tasks);

    const comando = despacharComando(
      reconhecimento({ actionId: "entrada" }),
      tasks,
      state
    );

    expect(comando.kind).toBe("entrada");
    expect(
      (comando as Extract<ComandoDespachado, { kind: "entrada" }>).mensagem
    ).toContain("Primeira");
  });

  it("entrada: devolve kind erro quando não há tarefa liberada", () => {
    const tasks = [tarefa({ id: "t1", deps: ["inexistente"] })];
    const state = estadoCom(tasks);

    const comando = despacharComando(
      reconhecimento({ actionId: "entrada" }),
      tasks,
      state
    );

    expect(comando.kind).toBe("erro");
  });

  it("feito: conclui a entrega em foco", () => {
    const tasks = [tarefa({ id: "t1", title: "Alvo" })];
    const comEntrada = despacharComando(
      reconhecimento({ actionId: "entrada" }),
      tasks,
      estadoCom(tasks)
    );
    const stateComFoco = (
      comEntrada as Extract<ComandoDespachado, { kind: "entrada" }>
    ).stateResultante;

    const comando = despacharComando(
      reconhecimento({ actionId: "feito" }),
      tasks,
      stateComFoco
    );

    expect(comando.kind).toBe("feito");
    expect(
      (comando as Extract<ComandoDespachado, { kind: "feito" }>).stateResultante
        .done
    ).toContain("t1");
  });

  it("feito: pede confirmação sem check-in ativo, e a confirmação explícita conclui mesmo sem foco só quando há um alvo", () => {
    const tasks = [tarefa({ id: "t1", deps: ["inexistente"] })];
    const state = estadoCom(tasks);

    const semConfirmar = despacharComando(
      reconhecimento({ actionId: "feito" }),
      tasks,
      state
    );
    expect(semConfirmar.kind).toBe("feito_confirmacao_necessaria");

    const comConfirmar = despacharComando(
      reconhecimento({ actionId: "feito" }),
      tasks,
      state,
      { feitoConfirmado: true }
    );
    // Confirmado, mas ainda sem foco algum — domínio não tem o que concluir.
    expect(comConfirmar.kind).toBe("erro");
  });

  it("saida: produz relatório do dia e resumo do dia seguinte", () => {
    const tasks = [tarefa({ id: "t1", date: "27/08" })];
    const state = estadoCom(tasks);

    const comando = despacharComando(
      reconhecimento({ actionId: "saida" }),
      tasks,
      state
    );

    expect(comando.kind).toBe("saida");
    if (comando.kind === "saida") {
      expect(comando.relatorioDoDia.length).toBeGreaterThan(0);
    }
  });

  it("copiloto: devolve a resposta do briefing", () => {
    const tasks = [tarefa({ id: "t1" })];
    const state = estadoCom(tasks);

    const comando = despacharComando(
      reconhecimento({ actionId: "copiloto" }),
      tasks,
      state
    );

    expect(comando.kind).toBe("copiloto");
    if (comando.kind === "copiloto") {
      expect(comando.mensagem.length).toBeGreaterThan(0);
    }
  });

  it("seletor: só sinaliza a troca de fase, sem tocar no domínio", () => {
    const tasks = [tarefa({ id: "t1" })];
    const state = estadoCom(tasks);

    expect(
      despacharComando(reconhecimento({ actionId: "seletor" }), tasks, state)
    ).toEqual({ kind: "seletor" });
  });
});

describe("criarObservadorLockClear", () => {
  it("não notifica antes de atingir os frames ausentes consecutivos exigidos", () => {
    const notifyLockCleared = vi.fn();
    const observador = criarObservadorLockClear(
      { notifyLockCleared },
      { framesAusentesNecessarios: 3 }
    );

    observador.notificarPresenca(false);
    observador.notificarPresenca(false);
    expect(notifyLockCleared).not.toHaveBeenCalled();
  });

  it("notifica ao atingir a sequência de frames ausentes", () => {
    const notifyLockCleared = vi.fn();
    const observador = criarObservadorLockClear(
      { notifyLockCleared },
      { framesAusentesNecessarios: 3 }
    );

    observador.notificarPresenca(false);
    observador.notificarPresenca(false);
    observador.notificarPresenca(false);
    expect(notifyLockCleared).toHaveBeenCalledTimes(1);
  });

  it("reinicia a contagem quando o token volta a aparecer (flicker não destrava)", () => {
    const notifyLockCleared = vi.fn();
    const observador = criarObservadorLockClear(
      { notifyLockCleared },
      { framesAusentesNecessarios: 3 }
    );

    observador.notificarPresenca(false);
    observador.notificarPresenca(false);
    observador.notificarPresenca(true);
    observador.notificarPresenca(false);
    observador.notificarPresenca(false);
    expect(notifyLockCleared).not.toHaveBeenCalled();
  });

  it("reset() limpa a contagem acumulada", () => {
    const notifyLockCleared = vi.fn();
    const observador = criarObservadorLockClear(
      { notifyLockCleared },
      { framesAusentesNecessarios: 3 }
    );

    observador.notificarPresenca(false);
    observador.notificarPresenca(false);
    observador.reset();
    observador.notificarPresenca(false);
    expect(notifyLockCleared).not.toHaveBeenCalled();
  });
});
