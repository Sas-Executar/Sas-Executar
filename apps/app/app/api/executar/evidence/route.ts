import type { EstadoOperacional } from "@/lib/executar/domain";
import { ErroPersistenciaRemota } from "@/lib/executar/remote-persistence";
import {
  contextoPersistenciaServidor,
  respostaErroPersistencia,
} from "@/lib/executar/server-persistence";

export async function GET(request: Request): Promise<Response> {
  try {
    const { persistence } = await contextoPersistenciaServidor();
    const path = new URL(request.url).searchParams.get("path");

    if (!path) {
      throw new ErroPersistenciaRemota(
        "O caminho autenticado da evidência é obrigatório.",
        400,
        "EVIDENCIA_INVALIDA"
      );
    }

    const file = await persistence.baixarEvidencia(path);
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    const contentType = file.headers.get("Content-Type");
    const contentLength = file.headers.get("Content-Length");

    if (contentType) {
      headers.set("Content-Type", contentType);
    }

    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new Response(file.body, { status: 200, headers });
  } catch (error) {
    return respostaErroPersistencia(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { actor, persistence } = await contextoPersistenciaServidor();
    const form = await request.formData();
    const raw = form.get("state");
    const taskId = form.get("taskId");
    const file = form.get("file");

    if (
      typeof raw !== "string" ||
      typeof taskId !== "string" ||
      !(file instanceof File)
    ) {
      throw new ErroPersistenciaRemota(
        "Estado, entrega e arquivo autenticados são obrigatórios.",
        400,
        "EVIDENCIA_INVALIDA"
      );
    }

    const state = JSON.parse(raw) as EstadoOperacional;

    if (state.organizationId !== actor.organizationId) {
      throw new ErroPersistenciaRemota(
        "A evidência não pertence à organização autenticada.",
        403,
        "EVIDENCIA_NAO_AUTORIZADA"
      );
    }

    const result = await persistence.enviarEvidencia(
      state,
      actor,
      taskId,
      file
    );

    return Response.json(result, { status: 201 });
  } catch (error) {
    return respostaErroPersistencia(error);
  }
}
