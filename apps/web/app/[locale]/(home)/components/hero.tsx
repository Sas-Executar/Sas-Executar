import { Button } from "@repo/design-system/components/ui/button";
import { ArrowRight, CheckCircle2, GitBranch, Target } from "lucide-react";
import Link from "next/link";
import { env } from "@/env";

const highlights = [
  { icon: Target, label: "Um foco de cada vez" },
  { icon: GitBranch, label: "Dependências reais" },
  { icon: CheckCircle2, label: "Evidência antes de concluir" },
] as const;

export const Hero = () => (
  <section aria-labelledby="executar-hero-title" className="w-full">
    <div className="container mx-auto">
      <div className="flex flex-col items-center justify-center gap-8 py-20 lg:py-36">
        <span className="rounded-full border px-4 py-2 text-muted-foreground text-sm">
          EXECUTAR · Operação orientada por resultado
        </span>
        <div className="flex flex-col items-center gap-4">
          <h1
            className="max-w-3xl text-center font-regular text-5xl tracking-tighter md:text-7xl"
            id="executar-hero-title"
          >
            Seu plano anda quando o próximo passo fica claro.
          </h1>
          <p className="max-w-2xl text-center text-lg text-muted-foreground leading-relaxed md:text-xl">
            Organize projetos, veja o que realmente pode começar e conclua cada
            entrega com evidência. Próximo 1 por vez.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild className="gap-3" size="lg">
            <Link href={env.NEXT_PUBLIC_APP_URL}>
              Abrir o EXECUTAR <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">Entender a disponibilidade</Link>
          </Button>
        </div>
        <ul className="flex flex-wrap justify-center gap-5 text-muted-foreground text-sm">
          {highlights.map(({ icon: Icon, label }) => (
            <li className="flex items-center gap-2" key={label}>
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
