import type { InputHTMLAttributes } from "react";

/**
 * Checkboxes de tarefa Markdown (`- [ ] item`) são renderizados desabilitados
 * — esta é uma superfície de leitura, não um editor de listas de tarefas.
 */
export function TaskCheckbox(
  properties: InputHTMLAttributes<HTMLInputElement>
) {
  if (properties.type !== "checkbox") {
    return <input {...properties} />;
  }

  return (
    <input {...properties} aria-readonly="true" disabled type="checkbox" />
  );
}
