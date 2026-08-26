import {
  type ProjecaoEstadoMobile,
  respostaEstadoMobileSchema,
} from "@repo/executar-contracts/mobile";

export async function carregarEstadoMobile(input: {
  readonly apiUrl: string;
  readonly token: string;
}): Promise<ProjecaoEstadoMobile> {
  const response = await fetch(`${input.apiUrl}/api/executar/mobile`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${input.token}`,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(
      payload?.error ?? `Falha ao sincronizar (${response.status}).`
    );
  }

  return respostaEstadoMobileSchema.parse(await response.json()).projection;
}
