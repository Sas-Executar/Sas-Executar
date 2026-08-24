import { defaults, type Options, withVercelToolbar } from "@nosecone/next";

export { createMiddleware as securityMiddleware } from "@nosecone/next";

// Nosecone security headers configuration
// https://docs.arcjet.com/nosecone/quick-start
export const noseconeOptions: Options = {
  ...defaults,
  // Content Security Policy (CSP) is disabled by default because the values
  // depend on which Next Forge features are enabled. See
  // https://www.next-forge.com/packages/security/headers for guidance on how
  // to configure it.
  contentSecurityPolicy: false,
};

export const noseconeOptionsWithToolbar: Options =
  withVercelToolbar(noseconeOptions);

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://*.clerk.accounts.dev https://*.clerk.com",
  "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://*.liveblocks.io wss://*.liveblocks.io https://*.knock.app wss://*.knock.app https://*.posthog.com https://*.sentry.io https://*.ingest.sentry.io https://*.vercel-insights.com",
  "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob:",
  "upgrade-insecure-requests",
] as const;

/**
 * Política explícita para o SaaS e para a PWA preservada. A política evita
 * origens genéricas e mantém somente os provedores já aprovados pelo produto.
 * O nonce dinâmico será a evolução natural quando o App Router deixar de
 * precisar de scripts inline no bootstrap.
 */
export const executarContentSecurityPolicy = CSP_DIRECTIVES.join("; ");
