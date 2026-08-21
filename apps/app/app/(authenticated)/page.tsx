import { auth } from "@repo/auth/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../public/legado/sprint-operacional/app.css";
import { ExecutarOperacional } from "./components/executar-operacional";

export const metadata: Metadata = {
  title: "EXECUTAR · Próximo 1 por vez",
  description: "Execução operacional por foco, dependências e evidências.",
};

const App = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  return <ExecutarOperacional organizationId={orgId} />;
};

export default App;

