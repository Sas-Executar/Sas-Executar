import type { Metadata } from "next";
import { ExecutarLegal } from "../_components/executar-legal";

export const metadata: Metadata = { title: "Privacidade | EXECUTAR" };

const PrivacyPage = () => (
  <ExecutarLegal title="Privacidade do EXECUTAR">
    <section>
      <h2 className="mb-2 font-semibold text-xl">Dados tratados</h2>
      <p>
        O produto trata identidade e organizações via Clerk, estado operacional
        por tenant na camada AWS e evidências privadas em S3. Cobrança,
        colaboração, notificações, analytics e suporte só operam quando os
        respectivos provedores estão configurados.
      </p>
    </section>
    <section>
      <h2 className="mb-2 font-semibold text-xl">Isolamento e autoridade</h2>
      <p>
        A organização autenticada define o tenant. O cliente, o modelo de IA e
        integrações externas não podem escolher outra organização nem manter um
        estado canônico paralelo.
      </p>
    </section>
    <section>
      <h2 className="mb-2 font-semibold text-xl">Suporte e direitos</h2>
      <p>
        Solicitações de acesso, correção ou exclusão devem usar o canal de
        suporte. Não envie senhas, tokens ou evidências confidenciais nesse
        formulário.
      </p>
    </section>
  </ExecutarLegal>
);

export default PrivacyPage;
