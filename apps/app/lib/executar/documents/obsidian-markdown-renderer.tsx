import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { Callout } from "./components/callout";
import { Code } from "./components/code";
import { DocumentShell } from "./components/document-shell";
import { Heading } from "./components/heading";
import { LinkAdapter } from "./components/link-adapter";
import { PropertiesPanel } from "./components/properties-panel";
import { TableViewport } from "./components/table-viewport";
import { TaskCheckbox } from "./components/task-checkbox";
import { classesCssSeguras, separarFrontmatter } from "./frontmatter";
import remarkObsidianCallouts from "./remark-obsidian-callouts";
import { esquemaSanitizacaoDocumento } from "./sanitize-schema";
import "./obsidian-editorial.css";
import type { TipoCallout } from "./types";

/**
 * Renderer Markdown estilo Obsidian, portado de HANDOFF_OBSIDIAN_REACT
 * (`03_REACT_HANDOFF/reference-implementation`) para a área de Documentos
 * do EXECUTAR. Sanitiza o HTML gerado (`rehype-sanitize`) — o conteúdo
 * nunca é `dangerouslySetInnerHTML`.
 *
 * Cortes de escopo desta primeira versão (documentados no plano, PR E):
 * sem resolução de `[[wiki-links]]` entre documentos (ver `LinkAdapter`) e
 * sem editor rico — só leitura/renderização.
 */
export function ObsidianMarkdownRenderer({
  source,
}: {
  readonly source: string;
}) {
  const { body, frontmatter } = separarFrontmatter(source);
  const cssClasses = classesCssSeguras(frontmatter);

  const components: Components = {
    h1: (props) => <Heading level={1} {...props} />,
    h2: (props) => <Heading level={2} {...props} />,
    h3: (props) => <Heading level={3} {...props} />,
    h4: (props) => <Heading level={4} {...props} />,
    h5: (props) => <Heading level={5} {...props} />,
    h6: (props) => <Heading level={6} {...props} />,
    a: (props) => <LinkAdapter {...props} />,
    table: (props) => <TableViewport {...props} />,
    input: (props) => <TaskCheckbox {...props} />,
    code: (props) => <Code {...props} />,
    div: (props) => {
      const attributes = props as Record<string, unknown>;
      const isCallout =
        attributes["data-callout"] === "true" ||
        attributes.dataCallout === "true";

      if (!isCallout) {
        return <div {...props} />;
      }

      const type = (attributes["data-callout-type"] ??
        attributes.dataCalloutType ??
        "note") as TipoCallout;
      const title =
        attributes["data-callout-title"] ?? attributes.dataCalloutTitle;
      const foldable =
        (attributes["data-callout-foldable"] ??
          attributes.dataCalloutFoldable) === "true";
      const defaultOpen =
        (attributes["data-callout-default-open"] ??
          attributes.dataCalloutDefaultOpen) !== "false";

      return (
        <Callout
          defaultOpen={defaultOpen}
          foldable={foldable}
          title={title as string | undefined}
          type={type}
        >
          {props.children}
        </Callout>
      );
    },
  };

  return (
    <DocumentShell classes={cssClasses}>
      <PropertiesPanel data={frontmatter} />
      <ReactMarkdown
        components={components}
        rehypePlugins={[
          rehypeSlug,
          [rehypeSanitize, esquemaSanitizacaoDocumento],
        ]}
        remarkPlugins={[remarkGfm, remarkObsidianCallouts]}
      >
        {body}
      </ReactMarkdown>
    </DocumentShell>
  );
}
