import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ObsidianMarkdownRenderer } from "@/lib/executar/documents/obsidian-markdown-renderer";

describe("ObsidianMarkdownRenderer", () => {
  it("renderiza frontmatter, títulos e texto", () => {
    const { container } = render(
      <ObsidianMarkdownRenderer
        source={"---\nowner: Equipe\n---\n# Título\n\nParágrafo de teste."}
      />
    );

    const heading = screen.getByRole("heading", { level: 1, name: "Título" });
    expect(heading).not.toBeNull();
    expect(container.querySelector("dt")?.textContent).toBe("owner");
    expect(container.querySelector("dd")?.textContent).toBe("Equipe");
    expect(container.textContent).toContain("Parágrafo de teste.");
  });

  it("reconhece callouts estilo Obsidian", () => {
    const { container } = render(
      <ObsidianMarkdownRenderer
        source={"> [!tip] Dica\n>\n> Use com moderação."}
      />
    );

    const callout = container.querySelector('[data-callout="tip"]');
    expect(callout).not.toBeNull();
    expect(callout?.textContent).toContain("Dica");
    expect(callout?.textContent).toContain("Use com moderação.");
  });

  it("desabilita checkboxes de tarefa (superfície de leitura)", () => {
    const { container } = render(
      <ObsidianMarkdownRenderer source={"- [ ] Item pendente"} />
    );

    const checkbox = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]'
    );
    expect(checkbox?.disabled).toBe(true);
  });

  it("sanitiza scripts inline do conteúdo Markdown", () => {
    const { container } = render(
      <ObsidianMarkdownRenderer
        source={"<script>window.__x = 1</script>\n\nTexto normal."}
      />
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("Texto normal.");
  });
});
