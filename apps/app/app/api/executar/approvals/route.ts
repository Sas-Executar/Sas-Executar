import type { AprovacaoCopiloto } from "@/lib/executar/domain";
import { ErroPersistenciaRemota } from "@/lib/executar/remote-persistence";
import {
  contextoPersistenciaServidor,
  respostaErroPersistencia,
} from "@/lib/executar/server-persistence";

export async function POST(request: Request): Promise<Response> {
  try {
    const { persistence } = await contextoPersistenciaServidor();
    const payload = (await request.json()) as {
      action?: "solicitar" | "resolver";
      approval?: AprovacaoCopiloto;
      approvalId?: string;
      approved?: boolean;
    };

    if (payload.action === "solicitar" && payload.approval) {
      const approvalId = await persistence.solicitarAprovacao(payload.approval);

      return Response.json({ approvalId }, { status: 201 });
    }

    if (
      payload.action === "resolver" &&
      payload.approvalId &&
      typeof payload.approved === "boolean"
    ) {
      await persistence.aprovar(payload.approvalId, payload.approved);

      return Response.json({ approved: payload.approved });
    }

    throw new ErroPersistenciaRemota(
      "A solicitação de aprovação é inválida.",
      400,
      "APROVACAO_INVALIDA"
    );
  } catch (error) {
    return respostaErroPersistencia(error);
  }
}
