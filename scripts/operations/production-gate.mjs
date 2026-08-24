import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  avaliarProducao,
  gatesProducao,
} from "../../apps/app/lib/executar/production-readiness.ts";

const argumentsList = process.argv.slice(2);
const reportOnly = argumentsList.includes("--report-only");
const evidencePath = argumentsList.find(
  (argument) => !argument.startsWith("--")
);

if (!evidencePath) {
  throw new Error(
    "Uso: node scripts/operations/production-gate.mjs <evidencias.json> [--report-only]"
  );
}

const evidence = JSON.parse(await readFile(resolve(evidencePath), "utf8"));

if (!Array.isArray(evidence)) {
  throw new Error("O arquivo de evidências precisa conter uma lista JSON.");
}

const steps = avaliarProducao(evidence);
const gates = gatesProducao(steps);
const report = {
  decision: gates.every((gate) => gate.status === "PASSOU") ? "GO" : "NO-GO",
  gates,
  blocked: steps
    .filter((step) => step.status !== "passou")
    .map(({ id, status, blockedBy }) => ({ id, status, blockedBy })),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (!reportOnly && report.decision !== "GO") {
  process.exitCode = 1;
}
