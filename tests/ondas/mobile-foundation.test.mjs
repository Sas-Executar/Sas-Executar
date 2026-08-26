import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

function read(path) {
  return readFile(new URL(path, root), "utf8");
}

async function json(path) {
  return JSON.parse(await read(path));
}

test("apps/app permanece Next.js 16 e React 19 sem Takeout", async () => {
  const app = await json("apps/app/package.json");
  const allDependencies = {
    ...app.dependencies,
    ...app.devDependencies,
  };

  assert.equal(app.dependencies.next, "16.1.6");
  assert.equal(app.dependencies.react, "19.2.8");
  assert.ok(!("takeout" in allDependencies));
});

test("apps/mobile usa Expo 57, Tamagui e Clerk nativo", async () => {
  const mobile = await json("apps/mobile/package.json");

  assert.match(mobile.dependencies.expo, /^~57\./);
  assert.equal(mobile.dependencies.tamagui, "2.7.7");
  assert.match(mobile.dependencies["@expo/ui"], /^~57\./);
  assert.equal(mobile.dependencies["@clerk/expo"], "4.6.0");
  assert.equal(mobile.dependencies["@repo/executar-contracts"], "workspace:*");
});

test("mobile não atravessa o design system web nem dependências server-only", async () => {
  const mobilePackage = await read("apps/mobile/package.json");
  const mobileSources = await Promise.all([
    read("apps/mobile/src/app/_layout.tsx"),
    read("apps/mobile/src/app/index.tsx"),
    read("apps/mobile/src/features/execution/execution-screen.tsx"),
    read("apps/mobile/src/lib/executar-client.ts"),
  ]);
  const source = `${mobilePackage}\n${mobileSources.join("\n")}`;

  assert.doesNotMatch(source, /@repo\/design-system/);
  assert.doesNotMatch(source, /server-only/);
  assert.doesNotMatch(source, /@radix-ui|tailwind|recharts/i);
});

test("iOS usa SwiftUI nativo com fallback Android compartilhável", async () => {
  const selectorIos = await read(
    "apps/mobile/src/components/scope-selector.ios.tsx"
  );
  const doneIos = await read(
    "apps/mobile/src/components/native-done-button.ios.tsx"
  );
  const selectorFallback = await read(
    "apps/mobile/src/components/scope-selector.tsx"
  );
  const doneFallback = await read(
    "apps/mobile/src/components/native-done-button.tsx"
  );

  assert.match(selectorIos, /@expo\/ui\/swift-ui/);
  assert.match(selectorIos, /pickerStyle\("menu"\)/);
  assert.match(doneIos, /@expo\/ui\/swift-ui/);
  assert.match(doneIos, /label="Feito"/);
  assert.match(selectorFallback, /from "tamagui"/);
  assert.match(doneFallback, /from "tamagui"/);
});

test("projeção móvel é autenticada, validada e somente leitura", async () => {
  const route = await read("apps/app/app/api/executar/mobile/route.ts");
  const client = await read("apps/mobile/src/lib/executar-client.ts");
  const contract = await read("packages/executar-contracts/mobile.ts");

  assert.match(route, /contextoPersistenciaServidor/);
  assert.match(route, /projecaoEstadoMobileSchema\.parse/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(client, /Authorization: `Bearer \$\{input\.token\}`/);
  assert.doesNotMatch(client, /organizationId|tenantId/);
  assert.match(contract, /file:[\s\S]*name:[\s\S]*size:[\s\S]*type:/);
  assert.doesNotMatch(contract, /data: z\./);
});

test("Takeout permanece referência, e Gate Mobile continua não aprovado", async () => {
  const agents = await read("AGENTS.md");
  const integration = await read("docs/runner/INTEGRACAO_FINAL.md");
  const status = await read("docs/runner/ONDA_4_STATUS.md");

  assert.match(agents, /Takeout serve apenas como referência/);
  assert.match(integration, /scaffold Expo somente leitura/);
  assert.match(status, /Sessão real, escritas, EAS e lojas: \*\*NÃO PASSOU\*\*/);
});

test("CI valida tipos, testes e export iOS do aplicativo mobile", async () => {
  const workflow = await read(".github/workflows/onda-1.yml");

  assert.match(workflow, /typecheck --filter=mobile/);
  assert.match(workflow, /test --filter=mobile/);
  assert.match(workflow, /build --filter=mobile/);
});
