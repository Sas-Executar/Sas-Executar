import type { Metadata } from "next";
import { ExecutarLegal } from "../_components/executar-legal";

export const metadata: Metadata = { title: "Termos | EXECUTAR" };

const TermsPage = () => (
  <ExecutarLegal title="Termos de pré-lançamento">
    <section>
      <h2 className="mb-2 font-semibold text-xl">Disponibilidade atual</h2>
      <p>
        Este ambiente é de Preview técnico. Preço, SLA, aplicativo móvel,
        integrações e disponibilidade comercial não são prometidos antes do Gate
        4 e do sign-off final.
      </p>
    </section>
    <section>
      <h2 className="mb-2 font-semibold text-xl">Uso seguro</h2>
      <p>
        O usuário deve respeitar as permissões da própria organização. Ações
        relevantes do Copiloto e do Agent-007 permanecem sujeitas a escopo,
        orçamento, auditoria e aprovação humana quando exigida.
      </p>
    </section>
    <section>
      <h2 className="mb-2 font-semibold text-xl">Alterações e vigência</h2>
      <p>
        A versão comercial será publicada após revisão jurídica. Este texto não
        substitui o contrato definitivo e registra explicitamente sua condição
        de pré-lançamento.
      </p>
    </section>
  </ExecutarLegal>
);

export default TermsPage;
