const TRAILING_SLASH_PATTERN = /\/$/;

export interface PublicMobileConfig {
  readonly apiUrl: string;
  readonly clerkPublishableKey: string;
}

function normalizeApiUrl(value: string): string {
  const url = new URL(value);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("EXPO_PUBLIC_EXECUTAR_API_URL precisa ser HTTP ou HTTPS.");
  }

  return url.toString().replace(TRAILING_SLASH_PATTERN, "");
}

export function readPublicMobileConfig():
  | { readonly configured: true; readonly value: PublicMobileConfig }
  | { readonly configured: false; readonly missing: readonly string[] } {
  const clerkPublishableKey =
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const rawApiUrl = process.env.EXPO_PUBLIC_EXECUTAR_API_URL?.trim();
  const missing: string[] = [];

  if (!clerkPublishableKey) {
    missing.push("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  if (!rawApiUrl) {
    missing.push("EXPO_PUBLIC_EXECUTAR_API_URL");
  }

  if (missing.length > 0) {
    return { configured: false, missing };
  }

  return {
    configured: true,
    value: {
      apiUrl: normalizeApiUrl(rawApiUrl as string),
      clerkPublishableKey: clerkPublishableKey as string,
    },
  };
}

export function requirePublicMobileConfig(): PublicMobileConfig {
  const result = readPublicMobileConfig();

  if (!result.configured) {
    throw new Error(
      `Configuração mobile ausente: ${result.missing.join(", ")}`
    );
  }

  return result.value;
}
