#!/usr/bin/env node
/**
 * Benchmark do corpus de fixtures OCR — PR-08 do plano "Scanner OCR-first
 * V2" (handoff §"OCR Fixture Corpus"): "não assumir o vencedor, medir
 * precisão e latência" antes de trocar `PSM.SPARSE_TEXT` (configuração
 * atual de produção, `scanner-engine/ocr-worker.ts`).
 *
 * Roda os mesmos 30 fixtures (`tests/fixtures/scanner/manifest.json`)
 * contra os 4 modos de PSM candidatos, usando exatamente a mesma
 * whitelist de caracteres/DPI que produção, e classifica cada leitura em:
 *   - correto: resolve pro `actionId` esperado
 *   - acao_falsa: resolve pra um `actionId` ERRADO (o caso perigoso — uma
 *     mutação de domínio incorreta seria disparada)
 *   - inconclusivo: não resolve pra nenhuma ação (seguro — o consenso
 *     nunca teria confirmado, só aguardaria mais leituras)
 *
 * Uso: `node apps/app/scripts/scanner/medir-corpus-ocr.mjs`
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createWorker, OEM, PSM } from "tesseract.js";
import { resolverVocabularioFechado } from "../../lib/executar/scanner-engine/recognition-resolver.ts";
import {
  CARACTERES_OCR_SCANNER,
  normalizarTextoScanner,
} from "../../lib/executar/scanner-ocr.ts";

const RAIZ_REPO = fileURLToPath(new URL("../../../../", import.meta.url));
const DIR_FIXTURES = join(RAIZ_REPO, "tests/fixtures/scanner");

const CANDIDATOS_PSM = [
  { nome: "SPARSE_TEXT (baseline de produção)", psm: PSM.SPARSE_TEXT },
  { nome: "SINGLE_WORD", psm: PSM.SINGLE_WORD },
  { nome: "SINGLE_LINE", psm: PSM.SINGLE_LINE },
  { nome: "RAW_LINE", psm: PSM.RAW_LINE },
];

function percentil(valoresOrdenados, p) {
  if (!valoresOrdenados.length) {
    return 0;
  }
  const indice = Math.min(
    valoresOrdenados.length - 1,
    Math.ceil((p / 100) * valoresOrdenados.length) - 1
  );
  return valoresOrdenados[Math.max(0, indice)];
}

async function medirCandidato(nomePsm, psm, manifest) {
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    cacheMethod: "none",
    langPath: join(RAIZ_REPO, "node_modules/@tesseract.js-data/eng/4.0.0"),
  });
  await worker.setParameters({
    preserve_interword_spaces: "0",
    tessedit_char_whitelist: CARACTERES_OCR_SCANNER,
    tessedit_pageseg_mode: psm,
    user_defined_dpi: "300",
  });

  const leituras = [];

  for (const item of manifest) {
    const caminho = join(DIR_FIXTURES, item.path);
    const inicio = performance.now();
    const { data } = await worker.recognize(caminho);
    const latencyMs = performance.now() - inicio;
    const normalizado = normalizarTextoScanner(data.text);
    const correspondencia = resolverVocabularioFechado(normalizado);

    let classificacao;
    if (!correspondencia) {
      classificacao = "inconclusivo";
    } else if (correspondencia.actionId === item.actionId) {
      classificacao = "correto";
    } else {
      classificacao = "acao_falsa";
    }

    leituras.push({
      ...item,
      classificacao,
      confidence: data.confidence,
      latencyMs,
    });
  }

  await worker.terminate();

  const latenciasOrdenadas = leituras
    .map((l) => l.latencyMs)
    .sort((a, b) => a - b);
  const contagem = (classificacao) =>
    leituras.filter((l) => l.classificacao === classificacao).length;

  return {
    acaoFalsa: contagem("acao_falsa"),
    correto: contagem("correto"),
    inconclusivo: contagem("inconclusivo"),
    latenciaMediaMs: Math.round(
      latenciasOrdenadas.reduce((soma, v) => soma + v, 0) /
        latenciasOrdenadas.length
    ),
    latenciaP95Ms: Math.round(percentil(latenciasOrdenadas, 95)),
    leituras,
    nome: nomePsm,
    total: leituras.length,
  };
}

async function main() {
  const manifest = JSON.parse(
    await readFile(join(DIR_FIXTURES, "manifest.json"), "utf8")
  );

  const relatorios = [];
  for (const candidato of CANDIDATOS_PSM) {
    console.log(`Medindo ${candidato.nome}...`);
    relatorios.push(
      await medirCandidato(candidato.nome, candidato.psm, manifest)
    );
  }

  console.log("\n=== Resultado por PSM (%d fixtures) ===\n", manifest.length);
  console.table(
    relatorios.map((r) => ({
      PSM: r.nome,
      acertos: `${r.correto}/${r.total}`,
      "ação falsa": r.acaoFalsa,
      inconclusivo: r.inconclusivo,
      "latência média (ms)": r.latenciaMediaMs,
      "latência p95 (ms)": r.latenciaP95Ms,
    }))
  );

  const comFalhas = relatorios.filter(
    (r) => r.acaoFalsa > 0 || r.inconclusivo > 0
  );
  if (comFalhas.length) {
    console.log("\n=== Detalhe das leituras não corretas ===\n");
    for (const relatorio of comFalhas) {
      const problemas = relatorio.leituras.filter(
        (l) => l.classificacao !== "correto"
      );
      console.log(`\n${relatorio.nome}:`);
      for (const problema of problemas) {
        console.log(
          `  ${problema.path} → esperado=${problema.actionId} classificacao=${problema.classificacao} confidence=${Math.round(problema.confidence)}`
        );
      }
    }
  }
}

main();
