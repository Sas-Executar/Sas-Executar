import { projecaoEstadoMobileSchema } from "@repo/executar-contracts/mobile";
import { projetarEstadoMobile } from "@/lib/executar/distribution";
import { ErroPersistenciaRemota } from "@/lib/executar/remote-persistence";
import {
  contextoPersistenciaServidor,
  respostaErroPersistencia,
} from "@/lib/executar/server-persistence";

export async function GET(): Promise<Response> {
  try {
    const { actor, persistence } = await contextoPersistenciaServidor();
    const state = await persistence.carregar();

    if (!state) {
      throw new ErroPersistenciaRemota(
        "Nenhum estado operacional foi criado para esta organização.",
        404,
        "ESTADO_AUSENTE"
      );
    }

    const projection = projecaoEstadoMobileSchema.parse(
      projetarEstadoMobile(state, actor)
    );

    return Response.json(
      { projection },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return respostaErroPersistencia(error);
  }
}
