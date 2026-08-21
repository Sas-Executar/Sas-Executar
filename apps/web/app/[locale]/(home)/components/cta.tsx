import { Button } from "@repo/design-system/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { env } from "@/env";

export const CTA = () => (
  <section aria-labelledby="executar-cta-title" className="w-full py-20">
    <div className="container mx-auto">
      <div className="flex flex-col items-center gap-6 rounded-xl bg-muted p-8 text-center lg:p-16">
        <h2
          className="max-w-2xl font-regular text-3xl tracking-tighter md:text-5xl"
          id="executar-cta-title"
        >
          Descubra o próximo passo e faça ele acontecer.
        </h2>
        <p className="max-w-xl text-lg text-muted-foreground">
          O mesmo projeto. A mesma fila. Uma entrega verificável de cada vez.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild className="gap-3">
            <Link href={env.NEXT_PUBLIC_APP_URL}>
              Abrir o EXECUTAR <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Conversar sobre implantação</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);
