import type { HTMLAttributes } from "react";

const LANGUAGE_CLASS_PATTERN = /language-([\w-]+)/u;

/** Marca blocos de código com a linguagem detectada (`class="language-x"`). */
export function Code(properties: HTMLAttributes<HTMLElement>) {
  const className = properties.className ?? "";
  const language = LANGUAGE_CLASS_PATTERN.exec(className)?.[1];

  if (!language) {
    return <code {...properties} />;
  }

  return (
    <code {...properties} data-language={language}>
      {properties.children}
    </code>
  );
}
