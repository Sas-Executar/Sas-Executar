const ORGANIZATION_ID = /^org_[A-Za-z0-9_-]+$/;
const USER_ID = /^user_[A-Za-z0-9_-]+$/;
const TOOL_CALL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const FORBIDDEN_ARGUMENTS = new Set([
  "actorUserId",
  "approvalId",
  "approved",
  "expectedRevision",
  "organizationId",
  "projectId",
  "userId",
]);

export type EfeitoFerramentaMcp = "read" | "write" | "relevant-write";
export type EscopoMcp = "executar:approve" | "executar:read" | "executar:write";

export interface AutoridadeMcpClerk {
  readonly organizationId: string;
  readonly scopes: readonly EscopoMcp[];
  readonly sessionId: string;
  readonly userId: string;
}

export interface EstadoAutoritativoMcp {
  readonly organizationId: string;
  readonly projectId: string;
  readonly revision: number;
}

export interface ContratoFerramentaMcp {
  readonly effect: EfeitoFerramentaMcp;
  readonly name: string;
}

export interface InvocacaoMcpAutorizada {
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly authority: Readonly<{
    expectedRevision: number;
    organizationId: string;
    projectId: string;
    sessionId: string;
    userId: string;
  }>;
  readonly requiresHumanApproval: boolean;
  readonly toolCallId: string;
  readonly toolName: string;
}

function requiredScope(effect: EfeitoFerramentaMcp): EscopoMcp {
  return effect === "read" ? "executar:read" : "executar:write";
}

export function authorizeMcpInvocation(
  session: AutoridadeMcpClerk,
  state: EstadoAutoritativoMcp,
  contract: ContratoFerramentaMcp,
  toolCallId: string,
  args: Readonly<Record<string, unknown>>
): InvocacaoMcpAutorizada {
  if (
    !(
      ORGANIZATION_ID.test(session.organizationId) &&
      USER_ID.test(session.userId) &&
      session.sessionId.trim()
    )
  ) {
    throw new Error("MCP exige sessão Clerk autenticada.");
  }

  if (
    state.organizationId !== session.organizationId ||
    !state.projectId.trim() ||
    !Number.isSafeInteger(state.revision) ||
    state.revision < 0
  ) {
    throw new Error("MCP não pode escolher tenant, projeto ou revisão.");
  }

  if (!(TOOL_CALL_ID.test(toolCallId) && contract.name.trim())) {
    throw new Error("A chamada MCP não possui identidade válida.");
  }

  const scopes = new Set(session.scopes);

  if (!scopes.has(requiredScope(contract.effect))) {
    throw new Error("A sessão MCP não possui o escopo exigido.");
  }

  if (contract.effect === "relevant-write" && !scopes.has("executar:approve")) {
    throw new Error("A ferramenta MCP exige escopo de aprovação.");
  }

  const forbidden = Object.keys(args).find((key) =>
    FORBIDDEN_ARGUMENTS.has(key)
  );

  if (forbidden) {
    throw new Error(`Argumento MCP tenta definir autoridade: ${forbidden}.`);
  }

  return {
    arguments: { ...args },
    authority: {
      expectedRevision: state.revision,
      organizationId: session.organizationId,
      projectId: state.projectId,
      sessionId: session.sessionId,
      userId: session.userId,
    },
    requiresHumanApproval: contract.effect === "relevant-write",
    toolCallId,
    toolName: contract.name,
  };
}
