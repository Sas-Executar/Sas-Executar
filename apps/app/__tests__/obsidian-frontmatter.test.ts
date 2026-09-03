import { describe, expect, it } from "vitest";
import {
  classesCssSeguras,
  separarFrontmatter,
} from "@/lib/executar/documents/frontmatter";

describe("separarFrontmatter", () => {
  it("separa frontmatter YAML válido do corpo", () => {
    const { body, frontmatter } = separarFrontmatter(
      "---\ntitle: Nota\ntags:\n  - projeto\n---\n# Olá\n"
    );

    expect(frontmatter).toEqual({ title: "Nota", tags: ["projeto"] });
    expect(body).toBe("# Olá\n");
  });

  it("retorna frontmatter vazio quando não há bloco YAML", () => {
    const { body, frontmatter } = separarFrontmatter("# Sem frontmatter");

    expect(frontmatter).toEqual({});
    expect(body).toBe("# Sem frontmatter");
  });

  it("retorna o texto original quando o bloco YAML não é fechado", () => {
    const source = "---\ntitle: Nota\n# Sem fechamento";
    const { body, frontmatter } = separarFrontmatter(source);

    expect(frontmatter).toEqual({});
    expect(body).toBe(source);
  });
});

describe("classesCssSeguras", () => {
  it("aceita classes da lista permitida", () => {
    expect(
      classesCssSeguras({ cssclasses: ["table-100", "img-wide"] })
    ).toEqual(["table-100", "img-wide"]);
  });

  it("descarta classes fora da lista permitida", () => {
    expect(
      classesCssSeguras({ cssclasses: ["table-100", "evil-arbitrary-class"] })
    ).toEqual(["table-100"]);
  });

  it("aceita uma única string além de array", () => {
    expect(classesCssSeguras({ cssclasses: "table-max" })).toEqual([
      "table-max",
    ]);
  });

  it("retorna vazio quando não há cssclasses", () => {
    expect(classesCssSeguras({})).toEqual([]);
  });
});
