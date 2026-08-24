import Link from "next/link";
import type { ReactNode } from "react";

interface ExecutarLegalProperties {
  readonly children: ReactNode;
  readonly title: string;
}

export const ExecutarLegal = ({ children, title }: ExecutarLegalProperties) => (
  <main className="mx-auto min-h-dvh w-full max-w-3xl px-6 py-16 sm:py-24">
    <header className="mb-10 border-b pb-8">
      <p className="mb-3 font-medium text-muted-foreground text-sm">
        EM VALIDAÇÃO PRÉ-GTM
      </p>
      <h1 className="font-semibold text-4xl tracking-tight">{title}</h1>
      <p className="mt-4 text-muted-foreground">
        Documento operacional de pré-lançamento. A vigência comercial depende de
        revisão jurídica e do Gate 4.
      </p>
    </header>
    <article className="space-y-8 text-base leading-7">{children}</article>
    <nav
      aria-label="Links institucionais"
      className="mt-12 flex gap-5 border-t pt-6"
    >
      <Link className="underline underline-offset-4" href="/legal/privacy">
        Privacidade
      </Link>
      <Link className="underline underline-offset-4" href="/legal/terms">
        Termos
      </Link>
      <Link className="underline underline-offset-4" href="/contact">
        Suporte
      </Link>
    </nav>
  </main>
);
