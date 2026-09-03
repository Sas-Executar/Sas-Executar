/**
 * Tipos e constantes das "views" do dashboard (Tarefas/Projetos/Documentos/
 * Calendário/Caminho) — compartilhados entre o componente principal
 * (executar-operacional.tsx) e as views/painéis extraídos pra arquivos
 * próprios (executar-product-surface.tsx, executar-mobile-drawer.tsx).
 * Extraído na correção estrutural da auditoria de 02/09/2026.
 */

export type View = "workspace" | "overview" | "documents" | "calendar" | "path";

const VIEWS_VALIDAS = new Set<View>([
  "workspace",
  "overview",
  "documents",
  "calendar",
  "path",
]);

export function viewInicialDaUrl(searchParams: URLSearchParams | null): View {
  const solicitada = searchParams?.get("view");

  return solicitada && VIEWS_VALIDAS.has(solicitada as View)
    ? (solicitada as View)
    : "workspace";
}

export const VIEWS: ReadonlyArray<{ id: View; label: string; icon: string }> = [
  { id: "workspace", label: "Tarefas", icon: "≡" },
  { id: "overview", label: "Projetos", icon: "▦" },
  { id: "documents", label: "Documentos", icon: "□" },
  { id: "calendar", label: "Calendário", icon: "◫" },
  { id: "path", label: "Caminho", icon: "↗" },
];

export const VIEW_TITLES: Readonly<Record<View, string>> = {
  calendar: "Calendário",
  documents: "Documentos",
  overview: "Projetos",
  path: "Caminho do resultado",
  workspace: "Tarefas",
};
