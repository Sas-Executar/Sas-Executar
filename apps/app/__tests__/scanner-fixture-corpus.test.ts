import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AcaoAdminId } from "@repo/executar-contracts/scanner";
import { describe, expect, it } from "vitest";

/**
 * Sanidade estrutural do corpus de fixtures OCR — PR-08 do plano "Scanner
 * OCR-first V2" (`tests/fixtures/scanner/`, ver README lá). Não roda OCR
 * de verdade (isso é `apps/app/scripts/scanner/medir-corpus-ocr.mjs`,
 * rodado manualmente — carregar o worker Tesseract/WASM real é caro
 * demais para a suíte rápida) — só garante que o manifesto e os arquivos
 * continuam consistentes entre si, pra um arquivo renomeado/apagado sem
 * atualizar o manifesto ser pego cedo.
 */

const DIR_FIXTURES = path.resolve(
  import.meta.dirname,
  "../../../tests/fixtures/scanner"
);

const ACOES_ADMIN: ReadonlySet<AcaoAdminId> = new Set([
  "entrada",
  "copiloto",
  "seletor",
  "feito",
  "saida",
]);

const VARIACOES_ESPERADAS = [
  "base",
  "distancia-longe",
  "distancia-perto",
  "perspectiva",
  "contraste-baixo",
  "desfoque",
];

interface FixtureManifestEntry {
  readonly actionId: string;
  readonly path: string;
  readonly variation: string;
}

async function lerManifest(): Promise<FixtureManifestEntry[]> {
  const conteudo = await readFile(
    path.join(DIR_FIXTURES, "manifest.json"),
    "utf8"
  );
  return JSON.parse(conteudo) as FixtureManifestEntry[];
}

describe("corpus de fixtures OCR (tests/fixtures/scanner)", () => {
  it("tem 5 palavras × 6 variações = 30 fixtures", async () => {
    const manifest = await lerManifest();
    expect(manifest).toHaveLength(30);
  });

  it("todo actionId do manifesto é um dos 5 tokens administrativos", async () => {
    const manifest = await lerManifest();
    for (const item of manifest) {
      expect(ACOES_ADMIN.has(item.actionId as AcaoAdminId)).toBe(true);
    }
  });

  it("cada palavra tem exatamente as 6 variações esperadas", async () => {
    const manifest = await lerManifest();
    for (const actionId of ACOES_ADMIN) {
      const variacoesDaPalavra = manifest
        .filter((item) => item.actionId === actionId)
        .map((item) => item.variation)
        .sort();
      expect(variacoesDaPalavra).toEqual([...VARIACOES_ESPERADAS].sort());
    }
  });

  it("todo path do manifesto aponta pra um arquivo que existe de verdade", async () => {
    const manifest = await lerManifest();
    for (const item of manifest) {
      const caminhoAbsoluto = path.join(DIR_FIXTURES, item.path);
      expect(existsSync(caminhoAbsoluto), `Ausente: ${item.path}`).toBe(true);
    }
  });
});
