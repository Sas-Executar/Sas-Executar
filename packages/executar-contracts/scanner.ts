/**
 * Resolução de payload do Scanner (QR impresso no Mapa-OS Prisma/Tripé) —
 * compartilhada entre `apps/app` (web) e `apps/mobile` (Expo), já que os
 * dois precisam reconhecer o mesmo esquema `executar://...` sem duplicar a
 * lógica. Este pacote não conhece o domínio operacional (`EstadoOperacional`
 * vive só em `apps/app/lib/executar/domain.ts`) — só resolve "o que foi
 * escaneado", nunca executa a mutação em si.
 */

const PAYLOAD_PATTERN = /^executar:\/\/(.+)$/i;

/**
 * As cinco ações administrativas físicas — o "Physical Action Token" que o
 * texto impresso no Mapa-OS carrega, reconhecido por OCR (`scanner-engine`)
 * ou por QR (`resolverPayloadScanner`, ambos os caminhos convergem para este
 * mesmo id). Única fonte da verdade para esse vocabulário fechado — outros
 * módulos que hoje declaram `AcaoScannerId` separadamente (ex.:
 * `apps/app/lib/executar/mapa-os-projection.ts`) devem reexportar este tipo,
 * nunca duplicá-lo.
 */
export type AcaoAdminId =
  | "copiloto"
  | "entrada"
  | "feito"
  | "saida"
  | "seletor";

/**
 * Resultado de uma tentativa de reconhecimento físico (OCR), com toda a
 * instrumentação de latência necessária para o orçamento de performance do
 * Scanner (SLO < 3.000 ms ponta a ponta). Produzido pelo
 * `recognition-resolver` do `scanner-engine` e consumido pelo
 * `recognition-consensus` e pelas métricas estruturadas do Scanner — nunca
 * pelo domínio operacional diretamente (que só recebe o `actionId` já
 * resolvido, via `command-dispatcher`).
 */
export interface RecognitionResult {
  readonly actionId: AcaoAdminId;
  /** Epoch ms de quando o frame foi capturado da câmera. */
  readonly capturedAt: number;
  /** Confiança relatada pelo motor de reconhecimento, de 0 a 100. */
  readonly confidence: number;
  readonly normalizedText: string;
  readonly rawText: string;
  readonly recognitionEndedAt: number;
  /** `recognitionEndedAt - recognitionStartedAt`, em ms — T_ocr do orçamento. */
  readonly recognitionLatencyMs: number;
  readonly recognitionStartedAt: number;
}

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
  { id: "hoje", label: "Hoje", destino: "workspace" },
  { id: "tarefas_feitas", label: "Tarefas feitas", destino: "workspace" },
];
