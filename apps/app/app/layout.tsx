import { env } from "@/env";
import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { Toolbar } from "@repo/feature-flags/components/toolbar";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

interface RootLayoutProperties {
  readonly children: ReactNode;
}

const webUrl = env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3001";

export const metadata: Metadata = {
  applicationName: "EXECUTAR",
  title: "EXECUTAR",
  description: "Gestão cognitiva e execução de projetos.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EXECUTAR",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f5f5",
};

const RootLayout = ({ children }: RootLayoutProperties) => (
  <html className={fonts} lang="pt-BR" suppressHydrationWarning>
    <body>
      <AnalyticsProvider>
        <DesignSystemProvider
          helpUrl={
            env.NEXT_PUBLIC_DOCS_URL ?? new URL("/contact", webUrl).toString()
          }
          privacyUrl={new URL("/legal/privacy", webUrl).toString()}
          termsUrl={new URL("/legal/terms", webUrl).toString()}
        >
          {children}
        </DesignSystemProvider>
      </AnalyticsProvider>
      <Toolbar />
    </body>
  </html>
);

export default RootLayout;
