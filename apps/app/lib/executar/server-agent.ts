import { createHash } from "node:crypto";
import {
  criarAdaptadorAgente,
  type DescritorFerramentaAgente,
} from "./agent-contract.ts";
import {
  type AprovacaoCopiloto,
  type AtorOperacional,
  type EstadoOperacional,
  entregasAtivas,
  executarFerramenta,
  FERRAMENTAS_OPERACIONAIS,
  filaBloqueada,
  filaPronta,
  focoAtual,
  LIMITES_COPILOTO,
  progresso,
  projetoAtivo,
  resolverAprovacaoCopiloto,
} from "./domain.ts";
import {
  ErroPersistenciaRemota,
  type PersistenciaOperacionalRemota,
} from "./remote-persistence.ts";

const MODEL_PATTERN = /^[a-z0-9][a-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MESSAGE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_MESSAGES = 24;
const MAX_MESSAGE_PARTS = 8;

export const MODELO_COPILOTO_PADRAO = "openai/gpt-5.6-luna";

export interface MensagemCopilotoServidor {
  readonly id: string;
  readonly parts: readonly { readonly text: string; readonly type: "text" }[];
  readonly role: "assistant" | "user";
}

export interface ResultadoFerramentaServidor {
  readonly approval: AprovacaoCopiloto | null;
  readonly approvalId: string | null;
  readonly context: ReturnType<typeof contextoOperacionalAgente>;
  readonly revision: number;
  readonly status: "executado" | "aprovação necessária";
  readonly text: string;
}

export interface SessaoAgenteServidor {
  context(): ReturnType<typeof contextoOperacionalAgente>;
  invoke(
    name: string,
    args: Record<string, unknown>
  ): Promise<ResultadoFerramentaServidor>;
  remaining(): number;
  readonly tools: readonly DescritorFerramentaAgente[];
}

function jsonCanonico(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(jsonCanonico).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${jsonCanonico(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function hashRun(value: unknown): string {
  return createHash("sha256").update(jsonCanonico(value)).digest("hex");
}

function validarReplayRun(
  result: Readonly<Record<string, unknown>>
): ResultadoFerramentaServidor {
  if (
    !(result.status === "executado" ||
      result.status === "aprovação necessária") ||
    typeof result.text !== "string" ||
    !Number.isSafeInteger(result.revision) ||
    !result.context ||
    typeof result.context !== "object" ||
    Array.isArray(result.context) ||
    !(result.approval === null || typeof result.approval === "object") ||
    !(
      result.approvalId === null || typeof result.approvalId === "string"
    )
  ) {
    throw new ErroPersistenciaRemota(
      "O replay do Agent-007 contém resultado inválido.",
      502,
      "REPLAY_AGENTE_INVALIDO"
    );
  }

  return result as unknown as ResultadoFerramentaServidor;
}

export function resolverModeloCopiloto(
  environment: Readonly<Record<string, string | undefined>> = process.env
): string {
  const model = environment.EXECUTAR_AI_MODEL?.trim() || MODELO_COPILOTO_PADRAO;

  if (model.length > 120 || !MODEL_PATTERN.test(model)) {
    throw new ErroPersistenciaRemota(
      "O modelo do Copiloto precisa usar o formato provedor/modelo.",
      500,
      "MODELO_COPILOTO_INVALIDO"
    );
  }

  return model;
}

function mensagemInvalida(): never {
  throw new ErroPersistenciaRemota(
    "As mensagens do Copiloto devem conter apenas texto autorizado.",
    400,
    "MENSAGEM_COPILOTO_INVALIDA"
  );
}

export function validarMensagensCopiloto(
  input: unknown
): MensagemCopilotoServidor[] {
  if (
    !Array.isArray(input) ||
    input.length < 1 ||
    input.length > MAX_MESSAGES
  ) {
    return mensagemInvalida();
  }

  let characters = 0;

  const messages = input.map((candidate): MensagemCopilotoServidor => {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      return mensagemInvalida();
    }

    const message = candidate as Record<string, unknown>;

    if (
      typeof message.id !== "string" ||
      !MESSAGE_ID_PATTERN.test(message.id) ||
      !(message.role === "user" || message.role === "assistant") ||
      !Array.isArray(message.parts) ||
      message.parts.length < 1 ||
      message.parts.length > MAX_MESSAGE_PARTS ||
      Object.keys(message).some((key) => !["id", "parts", "role"].includes(key))
    ) {
      return mensagemInvalida();
    }

    const parts = message.parts.map((candidatePart) => {
      if (
        !candidatePart ||
        typeof candidatePart !== "object" ||
        Array.isArray(candidatePart)
      ) {
        return mensagemInvalida();
      }

      const part = candidatePart as Record<string, unknown>;

      if (
        part.type !== "text" ||
        typeof part.text !== "string" ||
        !part.text.trim() ||
        Object.keys(part).some((key) => !["text", "type"].includes(key))
      ) {
        return mensagemInvalida();
      }

      characters += part.text.length;

      if (characters > LIMITES_COPILOTO.maxInputCharacters) {
        return mensagemInvalida();
      }

      return { type: "text" as const, text: part.text };
    });

    return { id: message.id, role: message.role, parts };
  });

  if (messages.at(-1)?.role !== "user") {
    return mensagemInvalida();
  }

  return messages;
}

export function contextoOperacionalAgente(state: EstadoOperacional): {
  readonly blocked: readonly { id: string; title: string }[];
  readonly evidenceCount: number;
  readonly focus: { id: string; title: string } | null;
  readonly progress: ReturnType<typeof progresso>;
  readonly project: { id: string; name: string };
  readonly ready: readonly { id: string; title: string }[];
  readonly revision: number;
} {
  const project = projetoAtivo(state);
  const tasks = entregasAtivas(state);
  const focus = focoAtual(tasks, state);
  const summarize = (task: { id: string; title: string }) => ({
    id: task.id,
    title: task.title,
  });

  return {
    blocked: filaBloqueada(tasks, state).slice(0, 25).map(summarize),
    evidenceCount: state.evidence.length,
    focus: focus ? summarize(focus) : null,
    progress: progresso(tasks, state),
    project: { id: project.id, name: project.name },
    ready: filaPronta(tasks, state).slice(0, 25).map(summarize),
    revision: state.revision,
  };
}

export async function criarSessaoAgenteServidor(
  actor: AtorOperacional,
  persistence: PersistenciaOperacionalRemota
): Promise<SessaoAgenteServidor> {
  const initial = await persistence.carregar();

  if (!initial) {
    throw new ErroPersistenciaRemota(
      "O estado operacional precisa ser sincronizado antes de usar a IA.",
      409,
      "ESTADO_COPILOTO_INDISPONIVEL"
    );
  }

  if (initial.organizationId !== actor.organizationId) {
    throw new ErroPersistenciaRemota(
      "O Copiloto não pode acessar outra organização.",
      403,
      "ORGANIZACAO_COPILOTO_INVALIDA"
    );
  }

  let current = initial;
  let pending: Promise<void> = Promise.resolve();

  const adapter = criarAdaptadorAgente(
    {
      organizationId: actor.organizationId,
      read: () => current,
      commit: () => undefined,
    },
    FERRAMENTAS_OPERACIONAIS,
    executarFerramenta,
    resolverAprovacaoCopiloto,
    LIMITES_COPILOTO.maxToolCalls
  );

  async function execute(
    name: string,
    args: Record<string, unknown>
  ): Promise<ResultadoFerramentaServidor> {
    const previous = current;
    const ledger = persistence.runLedger;
    const digest = hashRun({
      args,
      name,
      organizationId: actor.organizationId,
      projectId: previous.activeProjectId,
      revision: previous.revision,
    });
    const reference = {
      projectId: previous.activeProjectId,
      runId: `agent-${digest.slice(0, 40)}`,
    };

    if (ledger) {
      const started = await ledger.iniciar({
        ...reference,
        idempotencyKey: `agent:${digest}`,
        lockKey: `agent:${previous.activeProjectId}:state`,
        type: "COMMAND",
      });

      if (started.replayed) {
        if (started.status === "SUCCEEDED") {
          return validarReplayRun(started.result);
        }

        throw new ErroPersistenciaRemota(
          started.status === "RUNNING"
            ? "A mesma execução do Agent-007 ainda está ativa."
            : "A mesma execução do Agent-007 já falhou e não será repetida.",
          409,
          started.status === "RUNNING"
            ? "RUN_AGENTE_EM_EXECUCAO"
            : "RUN_AGENTE_JA_FALHOU"
        );
      }
    }

    try {
      const result = adapter.invoke(name, args);
      let approvalId: string | null = null;

      if (result.approval) {
        const effectKey = `effect-${hashRun(result.approval).slice(0, 48)}`;
        await ledger?.reservarEfeito(reference, effectKey);

        try {
          approvalId = await persistence.solicitarAprovacao(result.approval);
          await ledger?.finalizarEfeito(reference, effectKey, "SUCCEEDED");
        } catch (error) {
          const code =
            error instanceof ErroPersistenciaRemota
              ? error.code
              : "APROVACAO_NAO_PERSISTIDA";
          await ledger?.finalizarEfeito(
            reference,
            effectKey,
            "FAILED",
            code
          );
          throw error;
        }
      } else if (result.state !== previous) {
        const next = result.state;
        const effectKey = `effect-state-${next.revision}`;
        await ledger?.reservarEfeito(reference, effectKey);

        try {
          const saved = await persistence.salvar(
            next,
            actor,
            previous.revision
          );

          if (saved.revision !== next.revision) {
            throw new ErroPersistenciaRemota(
              "O servidor retornou uma revisão operacional divergente.",
              409,
              "REVISAO_COPILOTO_INVALIDA"
            );
          }

          current = next;
          await ledger?.finalizarEfeito(reference, effectKey, "SUCCEEDED");
        } catch (error) {
          const code =
            error instanceof ErroPersistenciaRemota
              ? error.code
              : "ESTADO_AGENTE_NAO_PERSISTIDO";
          await ledger?.finalizarEfeito(
            reference,
            effectKey,
            "FAILED",
            code
          );
          throw error;
        }
      }

      const response: ResultadoFerramentaServidor = {
        approval: result.approval,
        approvalId,
        context: contextoOperacionalAgente(current),
        revision: current.revision,
        status: result.status,
        text: result.text,
      };

      await ledger?.finalizar(
        reference,
        response as unknown as Readonly<Record<string, unknown>>
      );

      return response;
    } catch (error) {
      if (ledger) {
        const code =
          error instanceof ErroPersistenciaRemota
            ? error.code
            : "EXECUCAO_AGENTE_FALHOU";
        await ledger.falhar(reference, code);
      }

      throw error;
    }
  }

  return {
    tools: adapter.tools,
    context: () => contextoOperacionalAgente(current),
    invoke(name, args) {
      const result = pending.then(() => execute(name, args));
      pending = result.then(
        () => undefined,
        () => undefined
      );

      return result;
    },
    remaining: () => adapter.remaining(),
  };
}
