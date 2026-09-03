import YAML from "yaml";
import type { Frontmatter } from "./types";

/**
 * Separa o frontmatter YAML (`---\n...\n---`) do corpo Markdown. Portado de
 * HANDOFF_OBSIDIAN_REACT — mantém o parsing manual do original (em vez do
 * plugin `remark-frontmatter`) porque o `PropertiesPanel` precisa do objeto
 * já resolvido, não do nó da AST.
 */
export function separarFrontmatter(source: string): {
  readonly body: string;
  readonly frontmatter: Frontmatter;
} {
  if (!(source.startsWith("---\n") || source.startsWith("---\r\n"))) {
    return { frontmatter: {}, body: source };
  }

  const normalized = source.replace(/\r\n/gu, "\n");
  const end = normalized.indexOf("\n---\n", 4);

  if (end === -1) {
    return { frontmatter: {}, body: source };
  }

  const raw = normalized.slice(4, end);
  const body = normalized.slice(end + 5);
  const parsed: unknown = YAML.parse(raw);

  return {
    frontmatter:
      parsed && typeof parsed === "object" ? (parsed as Frontmatter) : {},
    body,
  };
}

const CLASSES_CSS_PERMITIDAS = new Set([
  "table-100",
  "table-max",
  "table-wide",
  "table-wrap",
  "table-nowrap",
  "table-numbers",
  "table-tabular",
  "table-small",
  "table-tiny",
  "table-lines",
  "row-lines",
  "col-lines",
  "row-alt",
  "col-alt",
  "img-100",
  "img-max",
  "img-wide",
  "img-grid",
]);

/**
 * Extrai `cssclasses` do frontmatter, restrito a uma lista fechada — nunca
 * permite que o conteúdo do documento injete uma classe CSS arbitrária.
 */
function valoresBrutos(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  return typeof raw === "string" ? [raw] : [];
}

export function classesCssSeguras(frontmatter: Frontmatter): string[] {
  const values = valoresBrutos(frontmatter.cssclasses);

  return values.filter(
    (value): value is string =>
      typeof value === "string" && CLASSES_CSS_PERMITIDAS.has(value)
  );
}
