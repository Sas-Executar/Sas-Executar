import { createAgentUIStreamResponse } from "@repo/ai";
import { criarAgenteCopiloto } from "@/lib/executar/ai-agent";
import { ErroPersistenciaRemota } from "@/lib/executar/remote-persistence";
import {
  criarSessaoAgenteServidor,
  validarMensagensCopiloto,
} from "@/lib/executar/server-agent";
import {
  contextoPersistenciaServidor,
  respostaErroPersistencia,
} from "@/lib/executar/server-persistence";

export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  try {
    const payload: unknown = await request.json();

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      Object.keys(payload).some((key) => key !== "messages")
    ) {
      throw new ErroPersistenciaRemota(
        "A requisição do Copiloto não pode definir autoridade ou modelo.",
        400,
        "REQUISICAO_COPILOTO_INVALIDA"
      );
    }

    const messages = validarMensagensCopiloto(
      (payload as { messages?: unknown }).messages
    );
    const { actor, persistence } = await contextoPersistenciaServidor();
    const session = await criarSessaoAgenteServidor(actor, persistence);
    const agent = criarAgenteCopiloto(actor, session);

    return await createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
      abortSignal: request.signal,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return respostaErroPersistencia(error);
  }
}
