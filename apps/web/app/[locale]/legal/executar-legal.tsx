import Link from "next/link";

interface LegalSection {
  readonly paragraphs: readonly string[];
  readonly title: string;
}

interface ExecutarLegalProps {
  readonly sections: readonly LegalSection[];
  readonly title: string;
}

export const ExecutarLegal = ({ sections, title }: ExecutarLegalProps) => (
  <main className="container max-w-4xl py-16">
    <Link className="text-muted-foreground text-sm hover:underline" href="/">
      ← Voltar ao EXECUTAR
    </Link>
    <header className="mt-8 grid gap-4 border-b pb-8">
      <span className="w-fit rounded-full border px-3 py-1 text-muted-foreground text-xs">
        EM VALIDAÇÃO PRÉ-GTM
      </span>
      <h1 className="font-extrabold text-4xl tracking-tight lg:text-5xl">
        {title}
      </h1>
      <p className="text-muted-foreground">
        Atualizado em 24 de agosto de 2026. Este texto descreve o runtime atual;
        a vigência comercial depende de revisão jurídica e sign-off do Gate 4.
      </p>
    </header>
    <div className="grid gap-10 py-10">
      {sections.map((section) => (
        <section className="grid gap-3" key={section.title}>
          <h2 className="font-semibold text-2xl tracking-tight">
            {section.title}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p className="text-muted-foreground leading-7" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
    <p className="border-t pt-8 text-muted-foreground text-sm">
      Dúvidas, solicitações de dados ou suporte:{" "}
      <Link className="underline" href="/contact">
        use o canal de contato
      </Link>
      .
    </p>
  </main>
);
