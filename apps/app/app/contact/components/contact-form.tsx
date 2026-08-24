"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Send } from "lucide-react";
import { useActionState } from "react";
import { type ContactState, contact } from "../actions/contact";

const initialState: ContactState = { message: "", status: "idle" };

export const ContactForm = () => {
  const [state, formAction, pending] = useActionState(contact, initialState);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-6 py-16 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="contact-title" className="space-y-4">
          <p className="font-medium text-muted-foreground text-sm">
            SUPORTE E IMPLANTAÇÃO
          </p>
          <h1
            className="font-semibold text-4xl tracking-tight"
            id="contact-title"
          >
            Fale sobre o próximo passo real.
          </h1>
          <p className="text-muted-foreground leading-7">
            Use este canal para implantação, piloto, privacidade ou suporte. Não
            envie senhas, tokens nem arquivos confidenciais.
          </p>
        </section>
        <form action={formAction} className="grid gap-5 rounded-xl border p-7">
          <div className="grid gap-2">
            <Label htmlFor="contact-name">Nome</Label>
            <Input
              autoComplete="name"
              disabled={pending}
              id="contact-name"
              maxLength={120}
              minLength={2}
              name="name"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact-email">E-mail</Label>
            <Input
              autoComplete="email"
              disabled={pending}
              id="contact-email"
              maxLength={254}
              name="email"
              required
              type="email"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact-message">Como podemos ajudar?</Label>
            <Textarea
              disabled={pending}
              id="contact-message"
              maxLength={4000}
              minLength={10}
              name="message"
              required
              rows={7}
            />
          </div>
          <Button className="gap-2" disabled={pending} type="submit">
            {pending ? "Enviando…" : "Enviar mensagem"}
            <Send aria-hidden="true" className="h-4 w-4" />
          </Button>
          <output
            aria-live="polite"
            className={
              state.status === "error"
                ? "text-destructive text-sm"
                : "text-muted-foreground text-sm"
            }
          >
            {state.message}
          </output>
        </form>
      </div>
    </main>
  );
};
