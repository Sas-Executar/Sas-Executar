import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  ClipboardList,
  FileText,
  Info,
  Lightbulb,
  ListChecks,
  MessageSquareQuote,
  NotebookText,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import type { PropriedadesCallout, TipoCallout } from "../types";

const ICONES: Record<TipoCallout, typeof Info> = {
  abstract: FileText,
  info: Info,
  todo: ClipboardList,
  tip: Lightbulb,
  success: CheckCircle2,
  question: CircleHelp,
  warning: AlertTriangle,
  failure: XCircle,
  danger: CircleAlert,
  bug: Bug,
  example: ListChecks,
  quote: MessageSquareQuote,
  note: NotebookText,
};

/**
 * Callout estilo Obsidian (`> [!tipo] Título`), reconhecido pelo plugin
 * `remark-obsidian-callouts.ts`. Dobrável quando a sintaxe usa `[!tipo]+`
 * ou `[!tipo]-`.
 */
export function Callout({
  children,
  defaultOpen = true,
  foldable = false,
  title,
  type,
}: PropriedadesCallout) {
  const [open, setOpen] = useState(defaultOpen);
  const Icone = ICONES[type];
  const conteudoTitulo = (
    <>
      <Icone aria-hidden="true" size={17} /> <span>{title ?? type}</span>
    </>
  );

  return (
    <aside className="execDocCallout" data-callout={type}>
      {foldable ? (
        <button
          aria-expanded={open}
          className="execDocCalloutTitle"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {conteudoTitulo}
        </button>
      ) : (
        <div className="execDocCalloutTitle">{conteudoTitulo}</div>
      )}
      {open && <div className="execDocCalloutBody">{children}</div>}
    </aside>
  );
}
