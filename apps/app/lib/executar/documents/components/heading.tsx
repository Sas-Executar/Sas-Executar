import type { HTMLAttributes } from "react";

type PropriedadesHeading = HTMLAttributes<HTMLHeadingElement> & {
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
};

/** Renderiza `h1`..`h6` preservando o `id` gerado pelo `rehype-slug`. */
export function Heading({ children, id, level, ...rest }: PropriedadesHeading) {
  const Tag = `h${level}` as const;

  return (
    <Tag id={id} {...rest}>
      {children}
    </Tag>
  );
}
