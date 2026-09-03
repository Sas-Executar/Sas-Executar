import type { ReactNode } from "react";

/**
 * Tipos do renderer Markdown estilo Obsidian, portado de
 * HANDOFF_OBSIDIAN_REACT/03_REACT_HANDOFF/reference-implementation para a
 * área de Documentos do EXECUTAR. Ver `obsidian-markdown-renderer.tsx` para
 * o componente principal.
 */

export type TipoCallout =
  | "abstract"
  | "info"
  | "todo"
  | "tip"
  | "success"
  | "question"
  | "warning"
  | "failure"
  | "danger"
  | "bug"
  | "example"
  | "quote"
  | "note";

export type Frontmatter = Record<string, unknown>;

export interface PropriedadesDocumentoObsidian {
  readonly source: string;
}

export interface PropriedadesCallout {
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  readonly foldable?: boolean;
  readonly title?: ReactNode;
  readonly type: TipoCallout;
}
