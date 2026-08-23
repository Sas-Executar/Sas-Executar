import { auth } from "@repo/auth/server";
import { criarPersistenciaAws } from "./aws-persistence";
import type { AtorOperacional } from "./domain.ts";
import {
  ErroPersistenciaRemota,
  type PersistenciaOperacionalRemota,
} from "./remote-persistence.ts";

export interface ContextoPersistenciaServidor {
  readonly actor: AtorOperacional;
  readonly persistence: PersistenciaOperacionalRemota;
}

export async function contextoPersistenciaServidor(): Promise<ContextoPersistenciaServidor> {
  const { orgId, userId } = await auth();

  if (!(orgId && userId)) {
    throw new ErroPersistenciaRemota(
      "Usuário e organização Clerk autenticados são obrigatórios.",
      401,
      "SESSAO_AUSENTE"
    );
  }

  const actor = {
    organizationId: orgId,
    userId,
    displayName: userId,
  };

  return {
    actor,
    persistence: criarPersistenciaAws(actor),
  };
}

export function respostaErroPersistencia(error: unknown): Response {
  if (error instanceof ErroPersistenciaRemota) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  return Response.json(
    {
      error: "Não foi possível concluir a operação autenticada.",
      code: "ERRO_INTERNO",
    },
    { status: 500 }
  );
}
