import type { EstadoOperacional } from "@/lib/executar/domain";
import { ErroPersistenciaRemota } from "@/lib/executar/remote-persistence";
import {
  contextoPersistenciaServidor,
  exigirLimiteOperacional,
  respostaErroPersistencia,
} from "@/lib/executar/server-persistence";

export async function GET(): Promise<Response> {
  try {
    const { persistence } = await contextoPersistenciaServidor();
    const state = await persistence.carregar();

    return Response.json({ state });
  } catch (error) {
    return respostaErroPersistencia(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { actor, persistence } = await contextoPersistenciaServidor();
    await exigirLimiteOperacional(actor, "state");
    const payload = (await request.json()) as {
      expectedRevision?: number;
      state?: EstadoOperacional;
    };

    if (
      !payload.state ||
      payload.state.organizationId !== actor.organizationId ||
      !Number.isSafeInteger(payload.state.revision) ||
      !Number.isSafeInteger(payload.expectedRevision)
    ) {
      throw new ErroPersistenciaRemota(
        "O estado não pertence à organização autenticada.",
        403,
        "ESTADO_NAO_AUTORIZADO"
      );
    }

    const result = await persistence.salvar(
      payload.state,
      actor,
      payload.expectedRevision as number
    );

    return Response.json(result);
  } catch (error) {
    return respostaErroPersistencia(error);
  }
}
