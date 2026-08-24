import type { TipoProjecao } from "./projection.ts";

export interface TemplateExecutar {
  readonly id: string;
  readonly projectionType: TipoProjecao;
  readonly slots: readonly string[];
  readonly variant: string;
  readonly version: string;
}

export interface TokensResolvidos {
  readonly overrideReason?: string;
  readonly values: Readonly<Record<string, string>>;
}

export const TEMPLATE_REGISTRY: readonly TemplateExecutar[] = [
  {
    id: "executar.app-dashboard",
    projectionType: "APP_DASHBOARD",
    slots: ["focus", "ready", "blocked", "progress"],
    variant: "default",
    version: "1.0.0",
  },
  {
    id: "executar.mapa-os",
    projectionType: "MAPA_OS",
    slots: ["project", "focus", "ready", "blocked"],
    variant: "swiss",
    version: "1.0.0",
  },
  {
    id: "executar.prisma",
    projectionType: "PRISMA",
    slots: ["project", "progress", "evidence"],
    variant: "swiss",
    version: "1.0.0",
  },
  {
    id: "executar.workbook",
    projectionType: "WORKBOOK",
    slots: ["project", "focus", "progress", "evidence"],
    variant: "swiss",
    version: "1.0.0",
  },
  {
    id: "executar.showroom",
    projectionType: "SHOWROOM",
    slots: ["project", "progress", "evidence"],
    variant: "fluent",
    version: "1.0.0",
  },
] as const;

export function selecionarTemplate(
  projectionType: TipoProjecao,
  variant: string
): TemplateExecutar {
  const template = TEMPLATE_REGISTRY.find(
    (item) => item.projectionType === projectionType && item.variant === variant
  );

  if (!template) {
    throw new Error("Template não registrado para projeção e variante.");
  }

  return template;
}

export function resolverTokens(
  globalTokens: Readonly<Record<string, string>>,
  variantTokens: Readonly<Record<string, string>>,
  overrides: Readonly<Record<string, string>> = {},
  overrideReason?: string
): TokensResolvidos {
  if (Object.keys(overrides).length && !overrideReason?.trim()) {
    throw new Error("Override de token exige justificativa explícita.");
  }

  return {
    values: { ...globalTokens, ...variantTokens, ...overrides },
    ...(overrideReason ? { overrideReason } : {}),
  };
}
