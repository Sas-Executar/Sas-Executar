"use server";

import { resend } from "@repo/email";
import { ContactTemplate } from "@repo/email/templates/contact";
import { log } from "@repo/observability/log";
import { limitOperationalMutation } from "@repo/rate-limit";
import { headers } from "next/headers";
import { env } from "@/env";

export interface ContactState {
  readonly message: string;
  readonly status: "error" | "idle" | "success";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, key: string, maximum: number): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maximum + 1) : "";
}

export async function contact(
  _previous: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = text(formData, "name", 120);
  const email = text(formData, "email", 254).toLowerCase();
  const message = text(formData, "message", 4000);

  if (
    name.length < 2 ||
    name.length > 120 ||
    !EMAIL_PATTERN.test(email) ||
    message.length < 10 ||
    message.length > 4000
  ) {
    return {
      message: "Revise nome, e-mail e mensagem antes de enviar.",
      status: "error",
    };
  }

  const requestHeaders = await headers();
  const identifier =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown";
  const limited = await limitOperationalMutation({
    identifier,
    limit: 3,
    namespace: "gtm-contact",
    window: "1 h",
    windowMs: 60 * 60 * 1000,
  });

  if (!limited.success) {
    return {
      message: "Limite de contato atingido. Tente novamente mais tarde.",
      status: "error",
    };
  }

  if (!(resend && env.RESEND_FROM)) {
    return {
      message: "O canal de suporte ainda não está ativo neste ambiente.",
      status: "error",
    };
  }

  try {
    await resend.emails.send({
      from: env.RESEND_FROM,
      to: env.RESEND_FROM,
      subject: "Contato EXECUTAR",
      replyTo: email,
      react: <ContactTemplate email={email} message={message} name={name} />,
    });
    return {
      message: "Mensagem enviada. Retornaremos pelo e-mail informado.",
      status: "success",
    };
  } catch {
    log.error("Falha no envio do contato EXECUTAR.");
    return {
      message: "Não foi possível enviar agora. Tente novamente mais tarde.",
      status: "error",
    };
  }
}
