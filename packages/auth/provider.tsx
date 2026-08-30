"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import type { Theme } from "@clerk/types";
import { useTheme } from "next-themes";
import type { ComponentProps } from "react";

// privacyUrl/termsUrl/helpUrl ficam aceitos por compatibilidade de assinatura,
// mas não são mais repassados: a versão atual de @clerk/react removeu
// `layout` de Appearance<Theme> (e não expõe um substituto em nenhum lugar
// que este pacote consiga localizar no momento) — ver histórico do PR para
// a investigação. Revisitar quando o mapeamento correto for confirmado.
type AuthProviderProperties = ComponentProps<typeof ClerkProvider> & {
  privacyUrl?: string;
  termsUrl?: string;
  helpUrl?: string;
};

export const AuthProvider = ({
  privacyUrl: _privacyUrl,
  termsUrl: _termsUrl,
  helpUrl: _helpUrl,
  ...properties
}: AuthProviderProperties) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const variables: Theme["variables"] = {
    fontFamily: "var(--font-sans)",
    fontFamilyButtons: "var(--font-sans)",
    fontWeight: {
      bold: "var(--font-weight-bold)",
      normal: "var(--font-weight-normal)",
      medium: "var(--font-weight-medium)",
    },
  };

  const elements: Theme["elements"] = {
    dividerLine: "bg-border",
    socialButtonsIconButton: "bg-card",
    navbarButton: "text-foreground",
    organizationSwitcherTrigger__open: "bg-background",
    organizationPreviewMainIdentifier: "text-foreground",
    organizationSwitcherTriggerIcon: "text-muted-foreground",
    organizationPreview__organizationSwitcherTrigger: "gap-2",
    organizationPreviewAvatarContainer: "shrink-0",
  };

  return (
    <ClerkProvider
      {...properties}
      appearance={{ ...(isDark ? dark : {}), elements, variables }}
    />
  );
};
