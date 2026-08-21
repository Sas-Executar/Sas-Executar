import { Button } from "@repo/design-system/components/ui/button";
import { Check, Clock3 } from "lucide-react";
import Link from "next/link";
import { env } from "@/env";

const available = [
  "Projetos, entregas e dependências reais",
  "Foco, calendário, caminho e evidências",
  "Copiloto com aprovação humana",
  "Comentários e avisos no estado operacional",
] as const;

const finalIntegration = [
  "Sincronização remota entre dispositivos",
  "Colaboração em tempo real e notificações externas",
  "Cobrança e preços definidos com Stripe",
  "Aplicativos Android e iOS após validação da base web",
] as const;

const Pricing = () => (
  <main aria-labelledby="executar-pricing-title" className="w-full py-20 lg:py-32">
    <div className="container mx-auto flex max-w-5xl flex-col gap-12">
      <header className="flex max-w-3xl flex-col gap-4">
        <h1
          className="font-regular text-4xl tracking-tighter md:text-6xl"
          id="executar-pricing-title"
        >
          Disponibilidade transparente. Preços ainda em definição.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          O EXECUTAR não apresenta valores, assinaturas ou recursos externos como
          ativos antes da configuração comercial e técnica correspondente.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-5 rounded-xl border p-7">
          <span className="text-muted-foreground text-sm">BASE OPERACIONAL</span>
          <h2 className="text-2xl">O que já existe em código</h2>
          <ul className="grid gap-3 text-sm">
            {available.map((item) => (
              <li className="flex items-start gap-3" key={item}>
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-auto">
            <Link href={env.NEXT_PUBLIC_APP_URL}>Abrir aplicativo</Link>
          </Button>
        </section>

        <section className="flex flex-col gap-5 rounded-xl border p-7">
          <span className="text-muted-foreground text-sm">INTEGRAÇÃO FINAL</span>
          <h2 className="text-2xl">O que depende de ativação</h2>
          <ul className="grid gap-3 text-sm">
            {finalIntegration.map((item) => (
              <li className="flex items-start gap-3" key={item}>
                <Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-auto" variant="outline">
            <Link href="/contact">Conversar sobre implantação</Link>
          </Button>
        </section>
      </div>
    </div>
  </main>
);

export default Pricing;
