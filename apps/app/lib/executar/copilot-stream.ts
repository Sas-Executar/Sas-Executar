import type { AprovacaoCopiloto } from "./domain.ts";

export interface EventoFluxoCopiloto {
  approval(approval: AprovacaoCopiloto, approvalId: string): void;
  mutation(revision: number): void;
  text(value: string): void;
}

function processarEvento(line: string, handlers: EventoFluxoCopiloto): void {
  if (!(line.startsWith("data: ") && line !== "data: [DONE]")) {
    return;
  }

  const event: unknown = JSON.parse(line.slice(6));

  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new Error("O Copiloto retornou um evento inválido.");
  }

  const item = event as Record<string, unknown>;

  if (item.type === "error") {
    throw new Error(
      typeof item.errorText === "string"
        ? item.errorText
        : "A geração de IA foi interrompida."
    );
  }

  if (item.type === "text-delta" && typeof item.delta === "string") {
    handlers.text(item.delta);
    return;
  }

  if (
    item.type !== "tool-output-available" ||
    !item.output ||
    typeof item.output !== "object" ||
    Array.isArray(item.output)
  ) {
    return;
  }

  const output = item.output as Record<string, unknown>;

  if (typeof output.revision === "number") {
    handlers.mutation(output.revision);
  }

  if (
    output.approval &&
    typeof output.approval === "object" &&
    typeof output.approvalId === "string"
  ) {
    handlers.approval(output.approval as AprovacaoCopiloto, output.approvalId);
  }
}

export async function lerFluxoCopiloto(
  stream: ReadableStream<Uint8Array>,
  handlers: EventoFluxoCopiloto
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const chunk = await reader.read();

    if (chunk.done) {
      buffer += decoder.decode();
      break;
    }

    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      processarEvento(line.trimEnd(), handlers);
    }
  }

  if (buffer.trim()) {
    processarEvento(buffer.trimEnd(), handlers);
  }
}
