import type { TableHTMLAttributes } from "react";

/** Envolve tabelas largas num contêiner com rolagem horizontal própria. */
export function TableViewport(
  properties: TableHTMLAttributes<HTMLTableElement>
) {
  return (
    <section
      aria-label="Tabela com rolagem quando necessária"
      className="execDocTableViewport"
    >
      <table {...properties} />
    </section>
  );
}
