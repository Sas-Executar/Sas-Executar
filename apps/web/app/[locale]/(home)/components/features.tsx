import {
  Bot,
  CalendarDays,
  CheckCircle2,
  GitBranch,
  MessageSquareText,
  Target,
} from "lucide-react";

const capabilities = [
  {
    icon: Target,
    title: "Foco que cabe no agora",
    description:
      "Uma entrega principal por vez, com esforço estimado e critério claro de conclusão.",
  },
  {
    icon: GitBranch,
    title: "Fila baseada em dependências",
    description:
      "Só entra no trabalho aquilo que realmente pode começar. O restante permanece visível e bloqueado.",
  },
  {
    icon: CalendarDays,
    title: "Calendário e caminho",
    description:
      "Visualize datas, capacidade, ciclos operacionais e dependências sem criar outro plano.",
  },
  {
    icon: CheckCircle2,
    title: "Resultado com evidência",
    description:
      "Registre comprovação, revise a entrega e confirme antes de marcar como concluída.",
  },
  {
    icon: Bot,
    title: "Copiloto que opera o plano",
    description:
      "Crie entregas, assuma foco, registre progresso e replaneje apenas o que foi afetado.",
  },
  {
    icon: MessageSquareText,
    title: "Contexto no lugar certo",
    description:
      "Comentários e avisos ficam associados à entrega e à organização correspondente.",
  },
] as const;

export const Features = () => (
  <section aria-labelledby="executar-features-title" className="w-full py-20">
    <div className="container mx-auto">
      <div className="mb-12 flex max-w-2xl flex-col gap-3">
        <h2
          className="font-regular text-3xl tracking-tighter md:text-5xl"
          id="executar-features-title"
        >
          Menos troca de contexto. Mais entregas concluídas.
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Visão geral, foco, calendário, caminho e evidências trabalham sobre o
          mesmo estado operacional.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {capabilities.map(({ icon: Icon, title, description }) => (
          <article className="flex flex-col gap-4 rounded-xl border p-6" key={title}>
            <Icon aria-hidden="true" className="h-6 w-6" />
            <div className="flex flex-col gap-2">
              <h3 className="font-medium text-lg">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);
