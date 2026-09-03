import { defaultSchema } from "rehype-sanitize";

/**
 * Esquema de sanitização do renderer — parte do `defaultSchema` do
 * `rehype-sanitize` e só acrescenta os atributos de dados que o plugin de
 * callouts (`remark-obsidian-callouts.ts`) e os componentes do renderer
 * precisam para funcionar. Nunca relaxa a política padrão (sem `<script>`,
 * sem atributos de evento, sem `javascript:` em `href`).
 */
export const esquemaSanitizacaoDocumento = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ["data-callout"],
      ["data-callout-type"],
      ["data-callout-title"],
      ["data-callout-foldable"],
      ["data-callout-default-open"],
      ["className"],
    ],
    a: [...(defaultSchema.attributes?.a ?? []), ["className"]],
    code: [...(defaultSchema.attributes?.code ?? []), ["className"]],
  },
};
