import type { Metadata } from "next";
import { ExecutarLegal } from "../executar-legal";

export const metadata: Metadata = {
  title: "Termos · EXECUTAR",
  description: "Condições pré-GTM do EXECUTAR.",
};

const sections = [
  {
    title: "Estado do serviço",
    paragraphs: [
      "O EXECUTAR está em validação pré-GTM. Uma conta, Preview ou demonstração não representa disponibilidade comercial, SLA, preço fechado ou integração externa aprovada.",
    ],
  },
  {
    title: "Autoridade e aprovações",
    paragraphs: [
      "A organização Clerk define o tenant. O estado operacional persistido define projetos e revisões. O Copiloto e o Agent-007 não substituem decisão humana: ações relevantes exigem aprovação registrada.",
    ],
  },
  {
    title: "Uso responsável",
    paragraphs: [
      "Não envie senhas, tokens, chaves privadas, conteúdo ilegal ou dados que você não esteja autorizado a tratar. Evidências devem ser necessárias ao trabalho e pertencer à organização ativa.",
      "A pessoa usuária continua responsável por revisar orientações, confirmar resultados e manter meios próprios de continuidade durante o piloto.",
    ],
  },
  {
    title: "Condições comerciais",
    paragraphs: [
      "Planos, preços, impostos, suporte, retenção, disponibilidade e cancelamento precisam ser aprovados e refletidos no Stripe antes de qualquer venda. Até lá, a página de preços mostra somente disponibilidade técnica.",
    ],
  },
] as const;

const Terms = () => <ExecutarLegal sections={sections} title="Termos de uso" />;

export default Terms;
