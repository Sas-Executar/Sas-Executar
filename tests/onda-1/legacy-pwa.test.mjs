import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const directory = path.join(root, "apps/app/public/legado/sprint-operacional");
const base = "/legado/sprint-operacional";
const load = (filename) => readFile(path.join(directory, filename), "utf8");

async function loadTasks() {
  const context = { window: {} };
  vm.runInNewContext(await load("data.js"), context);
  return context.window.__TASKS__;
}

async function evaluateReadyTasks(completedIds) {
  const source = await load("app.js");
  const requiredFunctions = ["isDone", "depsDone", "readyTasks", "blockedTasks"];
  const implementations = requiredFunctions.map((name) => {
    const match = source.match(new RegExp("^function " + name + "\\([^\\n]+", "m"));
    assert.ok(match, "A função legada " + name + " deve existir");
    return match[0];
  });

  const context = {
    TASKS: await loadTasks(),
    state: { done: completedIds },
    result: null,
  };
  vm.runInNewContext(
    implementations.join("\n") +
      "\nresult = { ready: readyTasks().map(t => t.id), blocked: blockedTasks().map(t => t.id) };",
    context
  );

  return JSON.parse(JSON.stringify(context.result));
}

test("preserva todos os arquivos executáveis da PWA", async () => {
  for (const filename of [
    "index.html",
    "app.css",
    "app.js",
    "data.js",
    "manifest.webmanifest",
    "sw.js",
    "icon.svg",
  ]) {
    assert.ok((await stat(path.join(directory, filename))).isFile(), filename);
  }
});

test("preserva as quatro faces e a linguagem operacional", async () => {
  const html = await load("index.html");
  for (const label of ["Visão geral", "Foco", "Calendário", "Caminho"]) {
    assert.ok(html.includes(label), label);
  }

  const app = await load("app.js");
  for (const label of [
    "Faça agora",
    "Pode fazer depois",
    "Ainda não pode",
    "Feito",
    "Comprovar",
  ]) {
    assert.ok(app.toLowerCase().includes(label.toLowerCase()), label);
  }
});

test("preserva as 33 entregas com predecessores válidos", async () => {
  const tasks = await loadTasks();
  assert.equal(tasks.length, 33);
  const ids = new Set(tasks.map((task) => task.id));
  assert.equal(ids.size, tasks.length);

  for (const task of tasks) {
    for (const dependency of task.deps) {
      assert.ok(ids.has(dependency), task.id + " depende de " + dependency);
    }
  }
});

test("fila inicial inclui somente entregas sem predecessores", async () => {
  const { ready, blocked } = await evaluateReadyTasks([]);
  assert.deepEqual(ready, ["APP-01", "BUS-01", "PHY-01", "INF-01", "CONS-01"]);
  assert.ok(blocked.includes("APP-02"));
  assert.ok(blocked.includes("BUS-02"));
});

test("concluir uma entrega libera somente seus sucessores válidos", async () => {
  const { ready } = await evaluateReadyTasks(["APP-01"]);
  assert.ok(ready.includes("APP-02"));
  assert.ok(!ready.includes("APP-03"));
  assert.ok(!ready.includes("BUS-02"));
});

test("dependências múltiplas precisam estar integralmente concluídas", async () => {
  const partial = await evaluateReadyTasks(["BUS-01", "PHY-01", "INF-01"]);
  assert.ok(!partial.ready.includes("BUS-02"));

  const complete = await evaluateReadyTasks([
    "BUS-01",
    "PHY-01",
    "INF-01",
    "CONS-01",
  ]);
  assert.ok(complete.ready.includes("BUS-02"));
});

test("manifesto e service worker ficam limitados ao escopo legado", async () => {
  const manifest = JSON.parse(await load("manifest.webmanifest"));
  assert.equal(manifest.start_url, base + "/");
  assert.equal(manifest.scope, base + "/");
  assert.ok(manifest.icons.every((icon) => icon.src.startsWith(base + "/")));

  const application = await load("app.js");
  assert.ok(application.includes("register('" + base + "/sw.js'"));
  assert.ok(application.includes("scope:'" + base + "/'"));

  const worker = await load("sw.js");
  assert.ok(worker.includes("const BASE='" + base + "'"));
  assert.ok(worker.includes("BASE+'/index.html'"));
  assert.ok(!worker.includes("caches.match('/index.html')"));
});

test("interface referencia apenas os próprios ativos da PWA", async () => {
  const html = await load("index.html");
  for (const asset of [
    "manifest.webmanifest",
    "icon.svg",
    "app.css",
    "data.js",
    "app.js",
  ]) {
    assert.ok(html.includes(base + "/" + asset), asset);
  }
});
