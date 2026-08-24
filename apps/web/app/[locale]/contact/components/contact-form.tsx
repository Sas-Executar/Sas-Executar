"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Check, Send } from "lucide-react";
import { useActionState } from "react";
import { type ContactState, contact } from "../actions/contact";

const initialState: ContactState = { message: "", status: "idle" };
const benefits = [
  "Implantação e piloto acompanhados",
  "Resposta sem prometer integração indisponível",
  "Contexto tratado como dado de suporte",
] as const;

export const ContactForm = () => {
  const [state, formAction, pending] = useActionState(contact, initialState);

  return (
    <main className="w-full py-20 lg:py-32">
      <div className="container mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
        <section
          aria-labelledby="contact-title"
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-3">
            <span className="text-muted-foreground text-sm">
              SUPORTE E IMPLANTAÇÃO
            </span>
            <h1
              className="max-w-xl font-regular text-4xl tracking-tighter md:text-6xl"
              id="contact-title"
            >
              Fale sobre o próximo passo real.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground leading-relaxed">
              Use este canal para implantação, piloto, privacidade ou suporte do
              EXECUTAR. Não envie senhas, tokens nem arquivos confidenciais.
            </p>
          </div>
          <ul className="grid gap-4">
            {benefits.map((benefit) => (
              <li className="flex items-start gap-3" key={benefit}>
                <Check aria-hidden="true" className="mt-1 h-4 w-4" />
                {benefit}
              </li>
            ))}
          </ul>
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
