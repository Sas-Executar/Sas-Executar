import type { Metadata } from "next";
import { ExecutarLegal } from "../executar-legal";

export const metadata: Metadata = {
  title: "Privacidade · EXECUTAR",
  description: "Comportamento de dados do EXECUTAR antes do Gate 4.",
};

const sections = [
  {
    title: "Dados e finalidade",
    paragraphs: [
      "O Clerk é a autoridade de identidade e organização. O EXECUTAR usa identificadores, nome, imagem e vínculo organizacional para autenticar a sessão, isolar tenants e atribuir ações.",
      "Projetos, entregas, dependências, revisões, aprovações, comentários e eventos existem para operar o plano e manter uma trilha auditável.",
    ],
  },
  {
    title: "Persistência e evidências",
    paragraphs: [
      "O estado canônico aprovado é Aurora PostgreSQL privado, acessado pela RDS Data API. Evidências ficam em S3 privado, criptografado, versionado e particionado pelo identificador da organização.",
      "A aplicação recusa caminhos de outro tenant e não inclui bytes de evidência no resumo enviado ao Copiloto.",
    ],
  },
  {
    title: "Fornecedores condicionais",
    paragraphs: [
      "Vercel hospeda a aplicação e mede uso agregado. Google Analytics, Sentry/Logtail, Liveblocks, Knock, Stripe, Resend e AI Gateway só exercem suas funções quando a configuração correspondente está ativa.",
      "Supabase, Neon e Vercel Blob são material histórico do repositório e não constituem o runtime canônico aprovado.",
    ],
  },
  {
    title: "Retenção, acesso e exclusão",
    paragraphs: [
      "A política comercial de retenção e o processo formal de atendimento ao titular ainda exigem revisão jurídica antes do GTM. Backup, restore e exclusão precisam preservar isolamento e auditabilidade.",
    ],
  },
] as const;

const Privacy = () => (
  <ExecutarLegal sections={sections} title="Aviso de privacidade" />
);

export default Privacy;
