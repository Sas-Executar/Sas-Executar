import type { Frontmatter } from "../types";

/**
 * Lista as propriedades do frontmatter YAML do documento (chave/valor),
 * quando existirem. Não renderiza nada se o documento não tiver frontmatter.
 */
export function PropertiesPanel({ data }: { readonly data: Frontmatter }) {
  const entries = Object.entries(data);

  if (!entries.length) {
    return null;
  }

  return (
    <dl aria-label="Propriedades do documento" className="execDocProperties">
      {entries.map(([key, value]) => (
        <div className="execDocPropertiesRow" key={key}>
          <dt>{key}</dt>
          <dd>{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
