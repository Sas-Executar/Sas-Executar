import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/design-system/components/ui/accordion";

const questions = [
  {
    question: "O EXECUTAR libera todas as tarefas de uma vez?",
    answer:
      "Não. Uma entrega só entra na fila quando suas dependências foram concluídas. O foco operacional permanece em uma ação por vez.",
  },
  {
    question: "O Copiloto conclui entregas sozinho?",
    answer:
      "Não. A conclusão depende de evidência verificada e aprovação humana explícita.",
  },
  {
    question: "Comentários e avisos substituem o plano?",
    answer:
      "Não. Eles acompanham o projeto e a entrega existentes, sem criar uma segunda fila de trabalho.",
  },
  {
    question: "O aplicativo para Android e iOS já está disponível?",
    answer:
      "Ainda não. A base Expo está planejada para depois da validação da aplicação web, da sincronização e do isolamento entre organizações.",
  },
] as const;

export const FAQ = () => (
  <section aria-labelledby="executar-faq-title" className="w-full py-20">
    <div className="container mx-auto grid gap-10 lg:grid-cols-2">
      <div className="flex max-w-xl flex-col gap-3">
        <h2
          className="font-regular text-3xl tracking-tighter md:text-5xl"
          id="executar-faq-title"
        >
          Clareza antes de prometer.
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          O produto mostra o que já está implementado e distingue as integrações
          que ainda dependem da etapa final.
        </p>
      </div>
      <Accordion className="w-full" collapsible type="single">
        {questions.map((item) => (
          <AccordionItem key={item.question} value={item.question}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);
