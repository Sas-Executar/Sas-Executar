import { auth } from "@repo/auth/server";
import type { AtorOperacional } from "./domain.ts";
import {
  criarPersistenciaRemota,
  ErroPersistenciaRemota,
  type PersistenciaOperacionalRemota,
} from "./remote-persistence.ts";
import { REFERENCIA_SUPABASE_LEGADO_AUTORIZADO } from "./supabase-project.ts";

export interface ContextoPersistenciaServidor {
  readonly actor: AtorOperacional;
  readonly persistence: PersistenciaOperacionalRemota;
}

export async function contextoPersistenciaServidor(): Promise<ContextoPersistenciaServidor> {
  const { orgId, userId, getToken } = await auth();

  if (!(orgId && userId)) {
    throw new ErroPersistenciaRemota(
      "Usuário e organização Clerk autenticados são obrigatórios.",
      401,
      "SESSAO_AUSENTE"
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const projectReference =
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF ??
    REFERENCIA_SUPABASE_LEGADO_AUTORIZADO;

  if (!(url && publishableKey)) {
    throw new ErroPersistenciaRemota(
      "A integração Supabase ainda não foi configurada neste ambiente.",
      503,
      "INTEGRACAO_NAO_CONFIGURADA"
    );
  }

  return {
    actor: {
      organizationId: orgId,
      userId,
      displayName: userId,
    },
    persistence: criarPersistenciaRemota(
      {
        projectOrigin: "existente_autorizado",
        projectReference,
        publishableKey,
        url,
      },
      {
        organizationId: orgId,
        userId,
        getToken,
      }
    ),
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
