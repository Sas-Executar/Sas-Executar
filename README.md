# EXECUTAR · repositório canônico

Este é o repositório principal do SaaS EXECUTAR. O starter `next-forge` existente é o chassis do produto; a PWA `Sprint-Operacional` foi incorporada como referência funcional sem reescrita visual.

## Pontos de entrada

- Aplicação SaaS: `apps/app/`.
- Aplicativo Expo: `apps/mobile/` (fundação técnica; Gate Mobile ainda pendente).
- PWA preservada: `apps/app/public/legado/sprint-operacional/`.
- Rota da PWA: `/legado/sprint-operacional/`.
- Plano canônico: `docs/runner/PLANO_SAAS_4_ONDAS.md`.
- Runner do Codex: `docs/runner/RUNNER_CODEX.md`.
- Inventário: `docs/runner/INVENTARIO_LEGADO.md`.

`apps/mobile` usa Expo SDK 57, Tamagui e controles SwiftUI nativos no iOS. Ele
consome uma projeção autenticada do backend existente por
`@repo/executar-contracts`; não importa o design system web e não substitui
`apps/app`. Takeout é somente referência arquitetural.

A PWA legada somente poderá ser removida após a versão SaaS reproduzir e testar Visão Geral, Foco, fila por dependências, Calendário, Caminho, Evidências e funcionamento PWA/offline.

A migração preserva Clerk como autoridade de identidade e organizações. A infraestrutura canônica é AWS em `sa-east-1`: Aurora PostgreSQL privado com RDS Data API, S3 privado, IAM/OIDC e Secrets Manager. O projeto Supabase legado permanece somente como fonte de migração auditável; não é a infraestrutura final e não substitui Clerk Auth.

## Infraestrutura AWS

- Template: `infra/aws/template.yaml`.
- Migrações Aurora: `infra/aws/migrations/`.
- Workflow: `.github/workflows/aws-infra.yml`.
- Autenticação de CI: GitHub Actions OIDC existente; não criar credenciais AWS estáticas.
- Autenticação de runtime: OIDC da Vercel com credenciais temporárias e escopo mínimo.
- O cluster não possui acesso público. Aplicações Vercel usam a RDS Data API por HTTPS.

Consulte `infra/aws/README.md` antes de aplicar ou destruir a stack.

---

# ▲ / next-forge

**Production-grade Turborepo template for Next.js apps.**

<div>
  <img src="https://img.shields.io/npm/dy/next-forge" alt="" />
  <img src="https://img.shields.io/npm/v/next-forge" alt="" />
  <img src="https://img.shields.io/github/license/vercel/next-forge" alt="" />
</div>

## Overview

[next-forge](https://github.com/vercel/next-forge) is a production-grade [Turborepo](https://turborepo.com) template for [Next.js](https://nextjs.org/) apps. It's designed to be a comprehensive starting point for building SaaS applications, providing a solid, opinionated foundation with minimal configuration required.

Built on a decade of experience building web applications, next-forge balances speed and quality to help you ship thoroughly-built products faster.

### Philosophy

next-forge is built around five core principles:

- **Fast** — Quick to build, run, deploy, and iterate on
- **Cheap** — Free to start with services that scale with you
- **Opinionated** — Integrated tooling designed to work together
- **Modern** — Latest stable features with healthy community support
- **Safe** — End-to-end type safety and robust security posture

## Demo

Experience next-forge in action:

- [Web](https://demo.next-forge.com) — Marketing website
- [App](https://app.demo.next-forge.com) — Main application
- [Storybook](https://storybook.demo.next-forge.com) — Component library
- [API](https://api.demo.next-forge.com/health) — API health check

## Features

next-forge comes with batteries included:

### Apps

- **Web** — Marketing site built with Tailwind CSS and TWBlocks
- **App** — Main application with authentication and database integration
- **API** — RESTful API with health checks and monitoring
- **Docs** — Documentation site powered by Mintlify
- **Email** — Email templates with React Email
- **Storybook** — Component development environment

### Packages

- **Authentication** — Powered by [Clerk](https://clerk.com)
- **Database** — Type-safe ORM with migrations
- **Design System** — Comprehensive component library with dark mode
- **Payments** — Subscription management via [Stripe](https://stripe.com)
- **Email** — Transactional emails via [Resend](https://resend.com)
- **Analytics** — Web ([Google Analytics](https://developers.google.com/analytics)) and product ([Posthog](https://posthog.com))
- **Observability** — Error tracking ([Sentry](https://sentry.io)), logging, and uptime monitoring ([BetterStack](https://betterstack.com))
- **Security** — Application security ([Arcjet](https://arcjet.com)), rate limiting, and secure headers
- **CMS** — Type-safe content management for blogs and documentation
- **SEO** — Metadata management, sitemaps, and JSON-LD
- **AI** — AI integration utilities
- **Webhooks** — Inbound and outbound webhook handling
- **Collaboration** — Real-time features with avatars and live cursors
- **Feature Flags** — Feature flag management
- **Cron** — Scheduled job management
- **Storage** — File upload and management
- **Internationalization** — Multi-language support
- **Notifications** — In-app notification system

## Getting Started

### Prerequisites

- Node.js 20+
- [Bun](https://bun.sh) (or npm/yarn/pnpm)
- [Stripe CLI](https://docs.stripe.com/stripe-cli) for local webhook testing

### Installation

Create a new next-forge project:

```sh
npx next-forge@latest init
```

### Setup

1. Configure your environment variables
2. Set up required service accounts (Clerk, Stripe, Resend, etc.)
3. Run the development server

For detailed setup instructions, read the [documentation](https://www.next-forge.com/docs).

## Structure

next-forge uses a monorepo structure managed by Turborepo:

```
next-forge/
├── apps/           # Deployable applications
│   ├── web/        # Marketing website (port 3001)
│   ├── app/        # Main application (port 3000)
│   ├── api/        # API server
│   ├── docs/       # Documentation
│   ├── email/      # Email templates
│   └── storybook/  # Component library
└── packages/       # Shared packages
    ├── design-system/
    ├── database/
    ├── auth/
    └── ...
```

Each app is self-contained and independently deployable. Packages are shared across apps for consistency and maintainability.

## Documentation

Full documentation is available at [next-forge.com/docs](https://www.next-forge.com/docs), including:

- Detailed setup guides
- Package documentation
- Migration guides for swapping providers
- Deployment instructions
- Examples and recipes

## Contributing

We welcome contributions! See the [contributing guide](https://github.com/vercel/next-forge/blob/main/.github/CONTRIBUTING.md) for details.

## Contributors

<a href="https://github.com/vercel/next-forge/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=vercel/next-forge" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

## License

MIT
