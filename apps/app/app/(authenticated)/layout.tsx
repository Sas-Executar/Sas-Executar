import { auth, currentUser } from "@repo/auth/server";
import { secure } from "@repo/security";
import type { ReactNode } from "react";
import { env } from "@/env";
import { NotificationsProvider } from "./components/notifications-provider";

interface AppLayoutProperties {
  readonly children: ReactNode;
}

const AppLayout = async ({ children }: AppLayoutProperties) => {
  if (env.ARCJET_KEY) {
    await secure(["CATEGORY:PREVIEW"]);
  }

  const [user, { redirectToSignIn }] = await Promise.all([
    currentUser(),
    auth(),
  ]);

  if (!user) {
    return redirectToSignIn();
  }

  return (
    <NotificationsProvider userId={user.id}>{children}</NotificationsProvider>
  );
};

export default AppLayout;
