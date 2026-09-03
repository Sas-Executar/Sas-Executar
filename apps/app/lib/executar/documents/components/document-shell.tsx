import type { ReactNode } from "react";

/**
 * Invólucro raiz do documento renderizado — aplica a classe do tema
 * (`execDocument`, ver `obsidian-editorial.css`) e as `cssclasses` seguras
 * vindas do frontmatter (`frontmatter.ts#classesCssSeguras`).
 */
export function DocumentShell({
  children,
  classes,
}: {
  readonly children: ReactNode;
  readonly classes: readonly string[];
}) {
  return (
    <article className={["execDocument", ...classes].join(" ")}>
      {children}
    </article>
  );
}
