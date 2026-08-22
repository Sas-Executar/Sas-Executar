import { auth } from "@repo/auth/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/env";
import "../../public/legado/sprint-operacional/app.css";
import { ExecutarOperacional } from "./components/executar-operacional";

export const metadata: Metadata = {
  title: "EXECUTAR · Próximo 1 por vez",
  description: "Execução operacional por foco, dependências e evidências.",
};

const App = async () => {
  const { orgId, userId } = await auth();

  if (!(orgId && userId)) {
    notFound();
  }

  return (
    <ExecutarOperacional
      collaborationAvailable={Boolean(env.LIVEBLOCKS_SECRET)}
      externalNotificationsAvailable={Boolean(
        env.NEXT_PUBLIC_KNOCK_API_KEY && env.NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID
      )}
      organizationId={orgId}
      userId={userId}
    />
  );
};

export default App;
