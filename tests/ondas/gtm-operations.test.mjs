import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

const execute = promisify(execFile);

test("gate operacional reporta código local sem fabricar GO", async () => {
  const { stdout } = await execute(
    process.execPath,
    [
      "scripts/operations/production-gate.mjs",
      "operations/gtm/evidence.local.json",
      "--report-only",
    ],
    { cwd: new URL("../..", import.meta.url) }
  );
  const report = JSON.parse(stdout);

  assert.equal(report.decision, "NO-GO");
  assert.equal(
    report.gates.find((gate) => gate.id === "codigo").status,
    "PASSOU"
  );
  assert.equal(
    report.gates.find((gate) => gate.id === "integracao").status,
    "NÃO PASSOU"
  );
  assert.ok(report.blocked.some((step) => step.id === "piloto_sete_dias"));
});

test("GTM inclui suporte real, legal local, piloto e recovery", async () => {
  const [contact, privacy, terms, launch, pilot, rollback, pricing] =
    await Promise.all([
      readFile(
        new URL(
          "../../apps/web/app/[locale]/contact/actions/contact.tsx",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(
        new URL(
          "../../apps/web/app/[locale]/legal/privacy/page.tsx",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(
        new URL(
          "../../apps/web/app/[locale]/legal/terms/page.tsx",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(
        new URL("../../docs/gtm/LAUNCH_CHECKLIST.md", import.meta.url),
        "utf8"
      ),
      readFile(
        new URL("../../docs/gtm/PILOT_7_DAYS.md", import.meta.url),
        "utf8"
      ),
      readFile(
        new URL("../../docs/gtm/ROLLBACK_RECOVERY.md", import.meta.url),
        "utf8"
      ),
      readFile(
        new URL("../../docs/gtm/PRICING_ANALYTICS_PRIVACY.md", import.meta.url),
        "utf8"
      ),
    ]);

  assert.match(contact, /limitOperationalMutation/);
  assert.match(contact, /resend\.emails\.send/);
  assert.match(privacy, /Aviso de privacidade/);
  assert.match(terms, /Termos de uso/);
  assert.match(launch, /GTM só recebe `GO`/);
  assert.match(pilot, /sete dias/);
  assert.match(rollback, /RUN_LEASE_EXPIRED/);
  assert.match(pricing, /Nenhum valor comercial foi aprovado/);
});
