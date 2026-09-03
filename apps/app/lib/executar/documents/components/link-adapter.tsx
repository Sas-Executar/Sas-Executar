import type { AnchorHTMLAttributes } from "react";

const EXTERNAL_LINK_PATTERN = /^https?:\/\//iu;

/**
 * Adapta links Markdown padrão (`[texto](href)`): links externos abrem em
 * nova aba com `rel="noreferrer noopener"`, links internos ficam como
 * âncoras normais. Nesta primeira versão não resolve `[[wiki-links]]` entre
 * documentos — a sintaxe de colchetes duplos do Obsidian passa como texto
 * literal; a resolução entre documentos do EXECUTAR fica documentada como
 * próximo passo.
 */
export function LinkAdapter({
  children,
  href = "",
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const isExternal = EXTERNAL_LINK_PATTERN.test(href);

  return (
    <a
      {...rest}
      href={href}
      rel={isExternal ? "noreferrer noopener" : undefined}
      target={isExternal ? "_blank" : undefined}
    >
      {children}
    </a>
  );
}
