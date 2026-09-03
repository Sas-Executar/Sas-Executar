import { visit } from "unist-util-visit";

/**
 * Plugin remark que reconhece a sintaxe de callout do Obsidian
 * (`> [!tipo]+ Título`) dentro de blockquotes e marca o nó para o
 * componente `Callout` renderizar. Portado de HANDOFF_OBSIDIAN_REACT.
 */

const ALIASES: Readonly<Record<string, string>> = {
  summary: "abstract",
  tldr: "abstract",
  hint: "tip",
  important: "tip",
  check: "success",
  done: "success",
  help: "question",
  faq: "question",
  caution: "warning",
  attention: "warning",
  fail: "failure",
  missing: "failure",
  error: "danger",
  cite: "quote",
};

const SUPORTADOS = new Set([
  "abstract",
  "info",
  "todo",
  "tip",
  "success",
  "question",
  "warning",
  "failure",
  "danger",
  "bug",
  "example",
  "quote",
  "note",
]);

const CALLOUT_PATTERN = /^\[!([a-zA-Z-]+)\]([+-])?\s*(.*)$/u;

// biome-ignore lint/suspicious/noExplicitAny: nós da AST do remark/unist não têm tipagem própria no pacote.
type NoArvore = any;

function casarLinhaDeControle(
  node: NoArvore
): { match: RegExpExecArray; paragraph: NoArvore } | null {
  const paragraph = node.children?.[0];
  const text = paragraph?.children?.[0];

  if (
    !paragraph ||
    paragraph.type !== "paragraph" ||
    !text ||
    text.type !== "text"
  ) {
    return null;
  }

  const match = CALLOUT_PATTERN.exec(text.value);

  return match ? { match, paragraph } : null;
}

function propriedadesCallout(match: RegExpExecArray) {
  const rawType = match[1].toLocaleLowerCase("pt-BR");
  const canonical = ALIASES[rawType] ?? rawType;
  const type = SUPORTADOS.has(canonical) ? canonical : "note";
  const foldMark = match[2];
  const title = match[3].trim() || type;

  return {
    "data-callout": "true",
    "data-callout-type": type,
    "data-callout-title": title,
    "data-callout-foldable": foldMark ? "true" : "false",
    "data-callout-default-open": foldMark === "-" ? "false" : "true",
  };
}

export default function remarkObsidianCallouts() {
  return (tree: NoArvore) => {
    visit(tree, "blockquote", (node: NoArvore) => {
      const casamento = casarLinhaDeControle(node);

      if (!casamento) {
        return;
      }

      const { match, paragraph } = casamento;

      node.data ??= {};
      node.data.hName = "div";
      node.data.hProperties = propriedadesCallout(match);

      // Remove a linha de controle do output visual; o restante do
      // conteúdo do blockquote é preservado.
      paragraph.children.shift();

      if (paragraph.children.length === 0) {
        node.children.shift();
      }
    });
  };
}
