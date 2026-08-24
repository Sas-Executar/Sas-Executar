import type {
  AprovacaoCopiloto,
  ContratoFerramenta,
  EntradaFerramenta,
  EstadoOperacional,
  ResultadoAcaoCopiloto,
} from "./domain";

export interface EsquemaEntradaAgente {
  readonly additionalProperties: false;
  readonly properties: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  >;
  readonly required: readonly string[];
  readonly type: "object";
}

export interface DescritorFerramentaAgente {
  readonly annotations: {
    readonly readOnlyHint: boolean;
    readonly destructiveHint: boolean;
    readonly idempotentHint: boolean;
    readonly openWorldHint: false;
  };
  readonly description: string;
  readonly inputSchema: EsquemaEntradaAgente;
  readonly name: string;
}

export interface PortaEstadoAgente {
  commit(next: EstadoOperacional): void;
  readonly organizationId: string;
  read(): EstadoOperacional;
}

export interface ResultadoInvocacaoAgente {
  readonly approval: AprovacaoCopiloto | null;
  readonly state: EstadoOperacional;
  readonly status: "executado" | "aprovação necessária";
  readonly text: string;
}

export interface ConfiguracaoAgentePreparada {
  readonly maxSteps: number;
  readonly maxToolCalls: number;
  readonly messageType: "InferAgentUIMessage";
  readonly model: null;
  readonly pattern: "ToolLoopAgent";
  readonly provider: null;
  readonly response: "toUIMessageStreamResponse";
  readonly schemaKey: "inputSchema";
  readonly transport: "DefaultChatTransport";
}

type ExecutorFerramenta = (
  tasks: EstadoOperacional["projects"][number]["tasks"],
  state: EstadoOperacional,
  input: EntradaFerramenta
) => EstadoOperacional;

type ResolvedorAprovacao = (
  state: EstadoOperacional,
  approval: AprovacaoCopiloto,
  approved: boolean
) => ResultadoAcaoCopiloto;

const STRING = { type: "string" } as const;
const NUMBER = { type: "number" } as const;
const BOOLEAN = { type: "boolean" } as const;
const OBJECT = { type: "object" } as const;

const CAMPOS: Readonly<
  Record<
    string,
    {
      readonly properties: Readonly<
        Record<string, Readonly<Record<string, unknown>>>
      >;
      readonly required: readonly string[];
    }
  >
> = {
  consultar_estado: { properties: {}, required: [] },
  criar_projeto: {
    properties: { projectName: STRING },
    required: ["projectName"],
  },
  selecionar_projeto: {
    properties: { targetProjectId: STRING },
    required: ["targetProjectId"],
  },
  renomear_projeto: {
    properties: { projectName: STRING },
    required: ["projectName"],
  },
  criar_entrega: {
    properties: { task: OBJECT },
    required: ["task"],
  },
  atualizar_entrega: {
    properties: { taskId: STRING, changes: OBJECT },
    required: ["taskId", "changes"],
  },
  importar_plano: {
    properties: { planContent: STRING },
    required: ["planContent"],
  },
  substituir_plano: {
    properties: { planContent: STRING },
    required: ["planContent"],
  },
  remover_entrega: {
    properties: { taskId: STRING },
    required: ["taskId"],
  },
  replanejar_subgrafo: {
    properties: { taskId: STRING, changes: OBJECT },
    required: ["taskId", "changes"],
  },
  ajustar_capacidade: {
    properties: { dailyCapacityMinutes: NUMBER },
    required: ["dailyCapacityMinutes"],
  },
  assumir_foco: {
    properties: { taskId: STRING },
    required: ["taskId"],
  },
  registrar_progresso: {
    properties: { taskId: STRING },
    required: ["taskId"],
  },
  registrar_evidencia: {
    properties: {
      taskId: STRING,
      note: STRING,
      url: STRING,
      verified: BOOLEAN,
    },
    required: ["taskId"],
  },
  concluir_entrega: {
    properties: { taskId: STRING },
    required: ["taskId"],
  },
};

export function descreverFerramentasAgente(
  contracts: readonly ContratoFerramenta[]
): DescritorFerramentaAgente[] {
  return contracts.map((contract) => {
    const fields = CAMPOS[contract.name];

    if (!fields) {
      throw new Error(`Ferramenta sem contrato de entrada: ${contract.name}.`);
    }

    return {
      name: contract.name,
      description: contract.purpose,
      inputSchema: {
        type: "object",
        properties: fields.properties,
        required: fields.required,
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: contract.effect === "read",
        destructiveHint: contract.effect === "relevant-write",
        idempotentHint: contract.effect === "read",
        openWorldHint: false,
      },
    };
  });
}

function validarArgumentos(
  descriptor: DescritorFerramentaAgente,
  argumentsValue: unknown
): Record<string, unknown> {
  if (
    !argumentsValue ||
    typeof argumentsValue !== "object" ||
    Array.isArray(argumentsValue)
  ) {
    throw new Error("Os argumentos da ferramenta devem ser um objeto.");
  }

  const args = argumentsValue as Record<string, unknown>;
  const allowed = new Set(Object.keys(descriptor.inputSchema.properties));

  for (const key of Object.keys(args)) {
    if (!allowed.has(key)) {
      throw new Error(
        `Argumento não autorizado para ${descriptor.name}: ${key}.`
      );
    }

    const expected = descriptor.inputSchema.properties[key]?.type;

    if (
      expected &&
      (typeof args[key] !== expected ||
        (expected === "object" &&
          (args[key] === null || Array.isArray(args[key]))))
    ) {
      throw new Error(`O argumento ${key} precisa ser do tipo ${expected}.`);
    }
  }

  for (const required of descriptor.inputSchema.required) {
    if (!(required in args)) {
      throw new Error(`Argumento obrigatório ausente: ${required}.`);
    }
  }

  return args;
}

export function criarAdaptadorAgente(
  port: PortaEstadoAgente,
  contracts: readonly ContratoFerramenta[],
  execute: ExecutorFerramenta,
  resolveApproval: ResolvedorAprovacao,
  maxToolCalls = 8
): {
  readonly tools: readonly DescritorFerramentaAgente[];
  invoke(name: string, args: Record<string, unknown>): ResultadoInvocacaoAgente;
  approve(
    approval: AprovacaoCopiloto,
    approved: boolean
  ): ResultadoAcaoCopiloto;
  remaining(): number;
} {
  if (!Number.isSafeInteger(maxToolCalls) || maxToolCalls < 1) {
    throw new Error("O limite de ferramentas do agente precisa ser positivo.");
  }

  const tools = descreverFerramentasAgente(contracts);
  let calls = 0;

  function currentState(): EstadoOperacional {
    const state = port.read();

    if (state.organizationId !== port.organizationId) {
      throw new Error("O agente não pode acessar uma organização divergente.");
    }

    return state;
  }

  function tasks(
    state: EstadoOperacional
  ): EstadoOperacional["projects"][number]["tasks"] {
    const project = state.projects.find(
      (candidate) => candidate.id === state.activeProjectId
    );

    if (!project) {
      throw new Error("Projeto ativo indisponível para o agente.");
    }

    return project.tasks;
  }

  return {
    tools,
    invoke(name, argumentsValue) {
      if (calls >= maxToolCalls) {
        throw new Error("Limite de ferramentas do agente atingido.");
      }

      const descriptor = tools.find((tool) => tool.name === name);
      const contract = contracts.find((tool) => tool.name === name);

      if (!(descriptor && contract)) {
        throw new Error("Ferramenta não reconhecida pelo agente.");
      }

      const args = validarArgumentos(descriptor, argumentsValue);
      const state = currentState();
      calls += 1;

      const input = {
        ...args,
        organizationId: state.organizationId,
        projectId: state.activeProjectId,
        expectedRevision: state.revision,
        name,
      } as EntradaFerramenta;

      if (contract.requiresApproval) {
        execute(tasks(state), state, { ...input, approved: true });

        const approval: AprovacaoCopiloto = {
          id: `${state.organizationId}:${state.activeProjectId}:${name}:${input.taskId ?? "projeto"}:${state.revision}`,
          organizationId: state.organizationId,
          projectId: state.activeProjectId,
          expectedRevision: state.revision,
          tool: name,
          taskId: input.taskId ?? null,
          summary: contract.purpose,
          input,
        };

        return {
          status: "aprovação necessária",
          state,
          approval,
          text: `Ação ${name} aguardando aprovação humana.`,
        };
      }

      const next = execute(tasks(state), state, input);

      if (next !== state) {
        port.commit(next);
      }

      return {
        status: "executado",
        state: next,
        approval: null,
        text: `Ferramenta ${name} executada no projeto autorizado.`,
      };
    },
    approve(approval, approved) {
      const result = resolveApproval(currentState(), approval, approved);

      if (result.state !== port.read()) {
        port.commit(result.state);
      }

      return result;
    },
    remaining() {
      return maxToolCalls - calls;
    },
  };
}

export function configuracaoAiSdkPreparada(
  maxSteps = 8,
  maxToolCalls = 8
): ConfiguracaoAgentePreparada {
  if (
    !Number.isSafeInteger(maxSteps) ||
    maxSteps < 1 ||
    !Number.isSafeInteger(maxToolCalls) ||
    maxToolCalls < 1
  ) {
    throw new Error("Os limites de execução do agente precisam ser positivos.");
  }

  return {
    pattern: "ToolLoopAgent",
    messageType: "InferAgentUIMessage",
    schemaKey: "inputSchema",
    transport: "DefaultChatTransport",
    response: "toUIMessageStreamResponse",
    maxSteps,
    maxToolCalls,
    provider: null,
    model: null,
  };
}

export function manifestoMcpPreparado(
  contracts: readonly ContratoFerramenta[]
): {
  readonly name: string;
  readonly version: string;
  readonly authority: "clerk-organization";
  readonly tools: readonly DescritorFerramentaAgente[];
} {
  return {
    name: "executar-copiloto",
    version: "1.0.0",
    authority: "clerk-organization",
    tools: descreverFerramentasAgente(contracts),
  };
}
