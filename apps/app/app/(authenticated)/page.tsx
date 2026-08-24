import { auth } from "@repo/auth/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/env";
import "../../public/legado/sprint-operacional/app.css";
import { ScopedExecutarOperacional } from "./components/scoped-executar-operacional";

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
    <ScopedExecutarOperacional
      key={`${orgId}:${userId}`}
      collaborationAvailable={Boolean(env.LIVEBLOCKS_SECRET)}
      externalNotificationsAvailable={Boolean(
        env.NEXT_PUBLIC_KNOCK_API_KEY && env.NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID
      )}
      organizationId={orgId}
      remotePersistenceAvailable={Boolean(
        env.AWS_REGION &&
          env.AWS_ROLE_ARN &&
          env.AURORA_DATABASE &&
          env.AURORA_RESOURCE_ARN &&
          env.AURORA_RUNTIME_SECRET_ARN &&
          env.EVIDENCE_BUCKET
      )}
      userId={userId}
    />
  );
};

export default App;
