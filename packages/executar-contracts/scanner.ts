/**
 * Resolução de payload do Scanner (QR impresso no Mapa-OS Prisma/Tripé) —
 * compartilhada entre `apps/app` (web) e `apps/mobile` (Expo), já que os
 * dois precisam reconhecer o mesmo esquema `executar://...` sem duplicar a
 * lógica. Este pacote não conhece o domínio operacional (`EstadoOperacional`
 * vive só em `apps/app/lib/executar/domain.ts`) — só resolve "o que foi
 * escaneado", nunca executa a mutação em si.
 */

const PAYLOAD_PATTERN = /^executar:\/\/(.+)$/i;

export type AcaoAdminId =
  | "copiloto"
  | "entrada"
  | "feito"
  | "saida"
  | "seletor";

const ACOES_ADMIN: ReadonlySet<string> = new Set<AcaoAdminId>([
  "entrada",
  "copiloto",
  "seletor",
  "feito",
  "saida",
]);

function isAcaoAdminId(value: string): value is AcaoAdminId {
  return ACOES_ADMIN.has(value);
}

export type AcaoScannerReconhecida =
  | { readonly kind: AcaoAdminId }
  | { readonly kind: "qr_jump" }
  | { readonly kind: "destino"; readonly destino: "documents" | "roadmap" }
  | { readonly kind: "tarefa"; readonly taskId: string };

export function resolverPayloadScanner(
  payload: string
): AcaoScannerReconhecida | null {
  const match = payload.trim().match(PAYLOAD_PATTERN);

  if (!match) {
    return null;
  }

  const resto = match[1];
  const [segmento, valor] = resto.split("/");
  const caminho = segmento.toLowerCase();
  const acaoAdmin = valor?.toLowerCase();

  if (caminho === "scan" && acaoAdmin && isAcaoAdminId(acaoAdmin)) {
    return { kind: acaoAdmin };
  }

  if (caminho === "task" && valor) {
    return { kind: "tarefa", taskId: valor };
  }

  if (caminho === "roadmap") {
    return { kind: "destino", destino: "roadmap" };
  }

  if (caminho === "documents") {
    return { kind: "destino", destino: "documents" };
  }

  if (caminho === "qr-jump") {
    return { kind: "qr_jump" };
  }

  return null;
}

/** Bucket de 10s — padrão ajustável (não há referência no FRD para o valor exato). */
const BUCKET_IDEMPOTENCIA_MS = 10_000;

export function idempotencyKeyScanner(
  organizationId: string,
  acao: string,
  alvo: string,
  nowMs: number
): string {
  const bucket = Math.floor(nowMs / BUCKET_IDEMPOTENCIA_MS);
  return `scanner:${organizationId}:${acao}:${alvo}:${bucket}`;
}

export interface AtalhoSeletor {
  readonly destino: string;
  readonly id: string;
  readonly label: string;
}

/** FR-SELETOR-003: conjunto padrão, até 5, customizável pelo usuário. */
export const ATALHOS_PADRAO_SELETOR: readonly AtalhoSeletor[] = [
  { id: "documentos", label: "Documentos", destino: "documents" },
  { id: "roadmap", label: "Roadmap", destino: "calendar" },
  { id: "sprint", label: "Sprint", destino: "overview" },
  { id: "hoje", label: "Hoje", destino: "today" },
  { id: "tarefas_feitas", label: "Tarefas feitas", destino: "done" },
];
