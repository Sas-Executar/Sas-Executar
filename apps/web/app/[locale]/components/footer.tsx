import Link from "next/link";
import { env } from "@/env";

const links = [
  { title: "Início", href: "/" },
  { title: "Disponibilidade", href: "/pricing" },
  { title: "Contato", href: "/contact" },
] as const;

export const Footer = () => (
  <footer className="border-foreground/10 border-t">
    <div className="container mx-auto flex flex-col justify-between gap-6 py-12 md:flex-row">
      <div className="flex max-w-lg flex-col gap-2">
        <strong className="text-xl">EXECUTAR</strong>
        <p className="text-muted-foreground text-sm">
          Foco, dependências e evidências. Próximo 1 por vez.
        </p>
      </div>
      <nav
        aria-label="Navegação do rodapé"
        className="flex flex-wrap gap-5 text-sm"
      >
        {links.map((link) => (
          <Link href={link.href} key={link.href}>
            {link.title}
          </Link>
        ))}
        <Link href={env.NEXT_PUBLIC_APP_URL}>Abrir aplicativo</Link>
      </nav>
    </div>
  </footer>
);
