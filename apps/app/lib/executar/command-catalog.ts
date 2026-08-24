export type ComandoCanonicoCopiloto =
  | "/agora"
  | "/bloqueio"
  | "/bomdia"
  | "/estado"
  | "/evidencia"
  | "/fechardia"
  | "/mapa"
  | "/replanejamento";

export interface ContratoComandoCopiloto {
  readonly aliases: readonly string[];
  readonly canonical: ComandoCanonicoCopiloto;
  readonly effect: "read" | "proposal";
  readonly purpose: string;
}

const WHITESPACE_PATTERN = /\s+/;

export const COMANDOS_COPILOTO: readonly ContratoComandoCopiloto[] = [
  {
    canonical: "/bomdia",
    aliases: ["/bom-dia"],
    effect: "read",
    purpose: "Abrir o dia a partir do estado canônico persistido.",
  },
  {
    canonical: "/agora",
    aliases: ["/proximo", "/próximo"],
    effect: "read",
    purpose: "Apresentar somente a próxima entrega liberada.",
  },
  {
    canonical: "/estado",
    aliases: ["/situacao", "/situação", "/status"],
    effect: "read",
    purpose: "Resumir progresso, foco, fila e bloqueios derivados.",
  },
  {
    canonical: "/fechardia",
    aliases: ["/fechar-dia"],
    effect: "proposal",
    purpose: "Fechar o dia sem concluir trabalho sem aprovação.",
  },
  {
    canonical: "/replanejamento",
    aliases: ["/replanejar"],
    effect: "proposal",
    purpose: "Calcular e propor alteração somente no subgrafo solicitado.",
  },
  {
    canonical: "/mapa",
    aliases: ["/caminho"],
    effect: "read",
    purpose: "Resumir o caminho de dependências do projeto ativo.",
  },
  {
    canonical: "/evidencia",
    aliases: ["/evidência"],
    effect: "read",
    purpose: "Consultar evidências da entrega em foco.",
  },
  {
    canonical: "/bloqueio",
    aliases: ["/bloqueios"],
    effect: "read",
    purpose: "Explicar a primeira dependência bloqueante real.",
  },
] as const;

const POR_ALIAS = new Map<string, ComandoCanonicoCopiloto>(
  COMANDOS_COPILOTO.flatMap((command) =>
    [command.canonical, ...command.aliases].map(
      (alias) => [alias, command.canonical] as const
    )
  )
);

export function resolverComandoCopiloto(
  input: string
): ComandoCanonicoCopiloto | "/desconhecido" {
  const normalized = input.trim().toLocaleLowerCase("pt-BR");

  if (normalized.startsWith("/")) {
    const token = normalized.split(WHITESPACE_PATTERN)[0];

    return POR_ALIAS.get(token) ?? "/desconhecido";
  }

  if (normalized.includes("agora") || normalized.includes("próximo")) {
    return "/agora";
  }

  if (normalized.includes("bom dia")) {
    return "/bomdia";
  }

  if (normalized.includes("fechar")) {
    return "/fechardia";
  }

  if (normalized.includes("replanej")) {
    return "/replanejamento";
  }

  return "/estado";
}

export function listarComandosCopiloto(): string {
  return COMANDOS_COPILOTO.map((command) => command.canonical).join(", ");
}
