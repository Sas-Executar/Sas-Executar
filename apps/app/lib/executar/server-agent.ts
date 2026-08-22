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
  let candidate: EstadoOperacional | null = null;
  let pending: Promise<void> = Promise.resolve();

  const adapter = criarAdaptadorAgente(
    {
      organizationId: actor.organizationId,
      read: () => current,
      commit: (next) => {
        candidate = next;
      },
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
    candidate = null;

    const result = adapter.invoke(name, args);
    let approvalId: string | null = null;

    if (result.approval) {
      approvalId = await persistence.solicitarAprovacao(result.approval);
    } else if (result.state !== previous) {
      const next = result.state;

      if (candidate !== next) {
        throw new ErroPersistenciaRemota(
          "A ferramenta não confirmou a mutação operacional.",
          409,
          "MUTACAO_COPILOTO_INVALIDA"
        );
      }

      const saved = await persistence.salvar(next, actor, previous.revision);

      if (saved.revision !== next.revision) {
        throw new ErroPersistenciaRemota(
          "O servidor retornou uma revisão operacional divergente.",
          409,
          "REVISAO_COPILOTO_INVALIDA"
        );
      }

      current = next;
    }

    return {
      approval: result.approval,
      approvalId,
      context: contextoOperacionalAgente(current),
      revision: current.revision,
      status: result.status,
      text: result.text,
    };
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
