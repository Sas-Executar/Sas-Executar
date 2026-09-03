import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  comentariosEntrega,
  etapasOnboarding,
  extrairMencoes,
  LIMITES_DISTRIBUICAO,
  marcarNotificacaoLida,
  notificacoesOperacionais,
  prepararIntegracoesDistribuicao,
  prepararMobilidade,
  presencasAtivas,
  projetarEstadoMobile,
  receberAtualizacaoCompartilhada,
  registrarComentario,
  registrarPresenca,
  salaColaboracao,
} from "../../apps/app/lib/executar/distribution.ts";
import {
  assumirFoco,
  concluirEntrega,
  criarProjeto,
  editarEntrega,
  novoEstado,
  registrarEvidencia,
  replanejarSubgrafo,
  restaurarEstado,
  selecionarProjeto,
} from "../../apps/app/lib/executar/domain.ts";

const tasks = [
  {
    id: "A",
    title: "Preparar entrega",
    front: "Operações",
    date: "24/08",
    mins: 30,
    deps: [],
    stage: 1,
  },
  {
    id: "B",
    title: "Publicar resultado",
    front: "Operações",
    date: "25/08",
    mins: 30,
    deps: ["A"],
    stage: 2,
  },
  {
    id: "C",
    title: "Registrar contexto",
    front: "Criativo",
    date: "25/08",
    mins: 15,
    deps: [],
    stage: 1,
  },
];

const ana = {
  organizationId: "org_a",
  userId: "user_ana",
  displayName: "Ana",
};
const bruno = {
  organizationId: "org_a",
  userId: "user_bruno",
  displayName: "Bruno",
};
const externo = {
  organizationId: "org_b",
  userId: "user_externo",
  displayName: "Externo",
};
const directory = {
  organizationId: "org_a",
  userIds: ["user_ana", "user_bruno"],
};
const instant = new Date("2026-08-21T18:00:00.000Z");

function initial() {
  return novoEstado("org_a", tasks);
}

function comment(
  state = initial(),
  author = bruno,
  body = "@user_ana revisar resultado",
  taskId = "A"
) {
  return registrarComentario(state, author, taskId, body, directory, instant);
}

function completed(state = initial()) {
  const focused = assumirFoco(tasks, state, "A");
  const evidence = registrarEvidencia(
    tasks,
    focused,
    "A",
    "Teste aprovado",
    "",
    true
  );

  return concluirEntrega(tasks, evidence, "A");
}

test("estado canônico nasce com colaboração sem cadastro paralelo de membros", () => {
  const state = initial();

  assert.deepEqual(state.collaboration, {
    presence: [],
    comments: [],
    notificationReads: [],
  });
  assert.ok(!("members" in state.collaboration));
});

test("snapshot antigo recebe colaboração vazia sem perder progresso", () => {
  const legacy = { ...initial(), collaboration: undefined, done: ["A"] };

  const restored = restaurarEstado(JSON.stringify(legacy), "org_a", tasks);

  assert.deepEqual(restored.done, ["A"]);
  assert.deepEqual(restored.collaboration.comments, []);
});

test("restauração remove comentários, leituras e presenças de outro tenant", () => {
  const state = comment();
  const contaminated = {
    ...state,
    collaboration: {
      ...state.collaboration,
      comments: [
        ...state.collaboration.comments,
        { ...state.collaboration.comments[0], organizationId: "org_b" },
      ],
      presence: [
        {
          organizationId: "org_b",
          projectId: state.activeProjectId,
          userId: "user_externo",
          displayName: "Externo",
          seenAt: instant.toISOString(),
        },
      ],
      notificationReads: [
        {
          id: "externa",
          organizationId: "org_b",
          projectId: state.activeProjectId,
          userId: "user_externo",
          readAt: instant.toISOString(),
        },
      ],
    },
  };
  const restored = restaurarEstado(
    JSON.stringify(contaminated),
    "org_a",
    tasks
  );

  assert.equal(restored.collaboration.comments.length, 1);
  assert.deepEqual(restored.collaboration.presence, []);
  assert.deepEqual(restored.collaboration.notificationReads, []);
});

test("sala Liveblocks usa organização Clerk e projeto ativo", () => {
  assert.equal(salaColaboracao(initial(), ana), "org_a:sprint-principal");
});

test("ator de outra organização não acessa sala, estado ou projeção", () => {
  for (const action of [
    () => salaColaboracao(initial(), externo),
    () => presencasAtivas(initial(), externo),
    () => notificacoesOperacionais(initial(), externo),
    () => projetarEstadoMobile(initial(), externo),
    () => etapasOnboarding(initial(), externo),
  ]) {
    assert.throws(action, /outra organização/);
  }
});

test("identidade Clerk inválida e nome vazio são recusados", () => {
  assert.throws(
    () => salaColaboracao(initial(), { ...ana, userId: "visitante" }),
    /usuário Clerk/
  );
  assert.throws(
    () => salaColaboracao(initial(), { ...ana, displayName: " " }),
    /nome de exibição/
  );
});

test("presença registra usuário autenticado e auditoria canônica", () => {
  const state = registrarPresenca(initial(), ana, "A", instant);

  assert.equal(state.collaboration.presence[0].userId, "user_ana");
  assert.equal(state.collaboration.presence[0].taskId, "A");
  assert.equal(state.events.at(-1).action, "colaboracao.presenca");
  assert.equal(state.events.at(-1).userId, "user_ana");
});

test("nova presença substitui sessão do mesmo usuário no mesmo projeto", () => {
  const first = registrarPresenca(initial(), ana, "A", instant);
  const second = registrarPresenca(
    first,
    ana,
    "C",
    new Date(instant.getTime() + 1000)
  );

  assert.equal(second.collaboration.presence.length, 1);
  assert.equal(second.collaboration.presence[0].taskId, "C");
});

test("presença vencida não é apresentada como conexão ativa", () => {
  const state = registrarPresenca(initial(), ana, "A", instant);

  assert.equal(presencasAtivas(state, ana, instant.getTime()).length, 1);
  assert.deepEqual(
    presencasAtivas(
      state,
      ana,
      instant.getTime() + LIMITES_DISTRIBUICAO.presenceTtlMilliseconds + 1
    ),
    []
  );
});

test("presença não pode apontar para entrega de outro projeto", () => {
  assert.throws(
    () => registrarPresenca(initial(), ana, "EXTERNA", instant),
    /projeto ativo/
  );
});

test("extração de menções deduplica usuários sem inventar cadastro", () => {
  assert.deepEqual(
    extrairMencoes("@user_ana revisar com @user_bruno e @user_ana"),
    ["user_ana", "user_bruno"]
  );
});

test("comentário pertence a tenant, projeto, entrega e autor reais", () => {
  const state = comment();
  const entry = state.collaboration.comments[0];

  assert.equal(entry.organizationId, "org_a");
  assert.equal(entry.projectId, "sprint-principal");
  assert.equal(entry.taskId, "A");
  assert.equal(entry.authorId, "user_bruno");
  assert.deepEqual(entry.mentions, ["user_ana"]);
  assert.equal(state.events.at(-1).userId, "user_bruno");
});

test("comentário rejeita entrega desconhecida, ator e diretório cruzados", () => {
  assert.throws(
    () => comment(initial(), bruno, "Mensagem", "EXTERNA"),
    /projeto ativo/
  );
  assert.throws(() => comment(initial(), externo), /outra organização/);
  assert.throws(
    () =>
      registrarComentario(initial(), ana, "A", "Mensagem", {
        organizationId: "org_b",
        userIds: ["user_ana"],
      }),
    /diretório Clerk/
  );
});

test("menção não autorizada pelo diretório Clerk é bloqueada", () => {
  assert.throws(
    () => comment(initial(), bruno, "@user_externo revisar"),
    /não autorizado pelo Clerk/
  );
});

test("comentário vazio, excessivo ou com menções demais é recusado", () => {
  assert.throws(() => comment(initial(), bruno, "  "), /não pode ficar vazio/);
  assert.throws(
    () => comment(initial(), bruno, "a".repeat(2001)),
    /2000 caracteres/
  );

  const userIds = Array.from({ length: 11 }, (_, index) => `user_${index}`);
  assert.throws(
    () =>
      registrarComentario(
        initial(),
        bruno,
        "A",
        userIds.map((id) => `@${id}`).join(" "),
        { organizationId: "org_a", userIds }
      ),
    /10 menções/
  );
});

test("consulta mostra somente comentários da entrega e projeto atuais", () => {
  let state = comment();
  state = comment(state, ana, "Outra entrega", "C");

  assert.equal(comentariosEntrega(state, ana, "A").length, 1);
  assert.equal(comentariosEntrega(state, ana, "C").length, 1);
});

test("menção gera notificação exclusivamente para o usuário mencionado", () => {
  const state = comment();
  const notifications = notificacoesOperacionais(state, ana);

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].kind, "mencao");
  assert.equal(notifications[0].userId, "user_ana");
  assert.deepEqual(notificacoesOperacionais(state, bruno), []);
});

test("comentário de outra pessoa no foco gera aviso contextual", () => {
  const focused = assumirFoco(tasks, initial(), "A");
  const state = comment(focused, bruno, "Resultado pronto para revisão");
  const notifications = notificacoesOperacionais(state, ana);

  assert.equal(notifications[0].kind, "comentario");
});

test("comentário sem menção fora do foco não gera ruído operacional", () => {
  const focused = assumirFoco(tasks, initial(), "A");
  const state = comment(focused, bruno, "Sem urgência", "C");

  assert.deepEqual(notificacoesOperacionais(state, ana), []);
});

test("conclusão e desbloqueio derivam do estado sem segunda fila", () => {
  const state = completed();
  const notifications = notificacoesOperacionais(state, ana);

  assert.ok(notifications.some((item) => item.kind === "entrega_concluida"));
  assert.ok(
    notifications.some(
      (item) => item.kind === "entrega_liberada" && item.taskId === "B"
    )
  );
  assert.ok(!("notifications" in state.collaboration));
});

test("entregas originalmente prontas não geram falso aviso de desbloqueio", () => {
  const state = completed();

  assert.ok(
    !notificacoesOperacionais(state, ana).some(
      (item) => item.kind === "entrega_liberada" && item.taskId === "C"
    )
  );
});

test("replanejamento localizado gera notificação sem alterar outro tenant", () => {
  const state = replanejarSubgrafo(initial(), "A", { date: "26/08" }).state;

  assert.ok(
    notificacoesOperacionais(state, ana).some(
      (item) => item.kind === "replanejamento" && item.taskId === "A"
    )
  );
});

test("leitura é isolada por usuário, projeto e organização", () => {
  const state = comment();
  const notification = notificacoesOperacionais(state, ana)[0];
  const read = marcarNotificacaoLida(state, ana, notification.id, instant);

  assert.equal(notificacoesOperacionais(read, ana)[0].read, true);
  assert.equal(read.events.at(-1).action, "notificacao.lida");
  assert.equal(read.events.at(-1).userId, "user_ana");
  assert.throws(
    () => marcarNotificacaoLida(read, bruno, notification.id),
    /não pertence ao usuário/
  );
});

test("marcar a mesma notificação como lida é idempotente", () => {
  const state = comment();
  const notification = notificacoesOperacionais(state, ana)[0];
  const read = marcarNotificacaoLida(state, ana, notification.id, instant);

  assert.equal(marcarNotificacaoLida(read, ana, notification.id), read);
});

test("notificação inexistente ou de outro tenant não pode ser lida", () => {
  assert.throws(
    () => marcarNotificacaoLida(initial(), ana, "inventada"),
    /não pertence ao usuário/
  );
  assert.throws(
    () => marcarNotificacaoLida(initial(), externo, "inventada"),
    /outra organização/
  );
});

test("atualização descendente do mesmo projeto é aplicada sem fila paralela", () => {
  const current = initial();
  const incoming = comment(current);
  const result = receberAtualizacaoCompartilhada(current, incoming, ana);

  assert.equal(result.status, "aplicada");
  assert.equal(result.state, incoming);
});

test("snapshot idêntico ou mais antigo não sobrescreve progresso", () => {
  const current = comment();

  assert.equal(
    receberAtualizacaoCompartilhada(current, current, ana).status,
    "sem_mudanca"
  );
  assert.equal(
    receberAtualizacaoCompartilhada(current, initial(), ana).status,
    "sem_mudanca"
  );
});

test("mesma revisão divergente produz conflito explícito", () => {
  const current = comment(initial(), bruno, "Versão A");
  const incoming = comment(initial(), bruno, "Versão B");
  const result = receberAtualizacaoCompartilhada(current, incoming, ana);

  assert.equal(result.status, "conflito");
  assert.equal(result.state, current);
});

test("histórico divergente com revisão maior não perde estado local", () => {
  const current = comment(initial(), bruno, "Versão local");
  const different = comment(initial(), bruno, "Versão externa");
  const incoming = comment(different, ana, "Segundo evento");
  const result = receberAtualizacaoCompartilhada(current, incoming, ana);

  assert.equal(result.status, "conflito");
  assert.equal(result.state, current);
});

test("atualização não muda projeto ativo nem cruza organização", () => {
  const withProject = criarProjeto(initial(), "Outro");
  const changed = selecionarProjeto(withProject, "outro");

  assert.equal(
    receberAtualizacaoCompartilhada(initial(), changed, ana).status,
    "conflito"
  );
  assert.throws(
    () =>
      receberAtualizacaoCompartilhada(
        initial(),
        novoEstado("org_b", tasks),
        ana
      ),
    /outra organização/
  );
});

test("Expo permanece bloqueado sem web, sync, RLS e Clerk móvel aprovados", () => {
  const readiness = prepararMobilidade({
    webProduction: false,
    remoteSync: false,
    tenantIsolation: false,
    clerkMobile: false,
  });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.blockers.length, 4);
  assert.equal(readiness.application, "apps/mobile");
  assert.deepEqual(readiness.platforms, ["android", "ios"]);
});

test("contrato Expo só libera criação após todos os predecessores reais", () => {
  const readiness = prepararMobilidade({
    webProduction: true,
    remoteSync: true,
    tenantIsolation: true,
    clerkMobile: true,
  });

  assert.equal(readiness.ready, true);
  assert.deepEqual(readiness.blockers, []);
  assert.equal(readiness.authority, "Clerk");
});

test("projeção mobile deriva foco, calendário e fila do estado existente", () => {
  const state = assumirFoco(tasks, initial(), "A");
  const projected = projetarEstadoMobile(state, ana);

  assert.equal(projected.organizationId, "org_a");
  assert.equal(projected.projectId, "sprint-principal");
  assert.equal(projected.focus.id, "A");
  assert.ok(projected.calendar.length > 0);
  assert.ok(!projected.ready.some((item) => item.id === "B"));
});

test("projeção mobile não expõe bytes/base64 de evidências privadas", () => {
  const focused = assumirFoco(tasks, initial(), "A");
  const state = registrarEvidencia(
    tasks,
    focused,
    "A",
    "Arquivo validado",
    "",
    true,
    {
      name: "prova.pdf",
      type: "application/pdf",
      size: 20,
      data: "data:application/pdf;base64,c2VjcmV0",
    }
  );
  const projected = projetarEstadoMobile(state, ana);

  assert.equal(projected.evidence[0].file.name, "prova.pdf");
  assert.ok(!("data" in projected.evidence[0].file));
  assert.doesNotMatch(JSON.stringify(projected), /c2VjcmV0/);
});

test("integração reutiliza pacotes next-forge e degrada sem segredos", () => {
  const integration = prepararIntegracoesDistribuicao(initial(), ana, {
    liveblocks: false,
    knock: false,
  });

  assert.equal(integration.collaboration.package, "@repo/collaboration");
  assert.equal(integration.notifications.package, "@repo/notifications");
  assert.equal(integration.collaboration.room, "org_a:sprint-principal");
  assert.equal(integration.collaboration.enabled, false);
  assert.equal(integration.notifications.enabled, false);
});

test("integração ativada mantém destinatário vinculado ao Clerk", () => {
  const integration = prepararIntegracoesDistribuicao(initial(), ana, {
    liveblocks: true,
    knock: true,
  });

  assert.equal(integration.collaboration.enabled, true);
  assert.equal(integration.notifications.enabled, true);
  assert.equal(integration.notifications.recipientId, "user_ana");
});

test("onboarding reflete progresso real sem inventar cobrança", () => {
  const initialSteps = etapasOnboarding(initial(), ana);
  const finalSteps = etapasOnboarding(completed(), ana);

  assert.equal(
    initialSteps.find((step) => step.id === "entrega").complete,
    true
  );
  assert.equal(
    initialSteps.find((step) => step.id === "resultado").complete,
    false
  );
  assert.equal(
    finalSteps.find((step) => step.id === "resultado").complete,
    true
  );
  assert.ok(
    !initialSteps.some((step) => /pagamento|cobrança/i.test(step.title))
  );
});

test("edição paralela do mesmo projeto preserva detecção de conflito", () => {
  const local = editarEntrega(initial(), "A", { title: "Entrega local" });
  const remote = editarEntrega(initial(), "A", { title: "Entrega externa" });
  const result = receberAtualizacaoCompartilhada(local, remote, ana);

  assert.equal(result.status, "conflito");
  assert.equal(result.state.projects[0].tasks[0].title, "Entrega local");
});

test("contrato de distribuição não instala Expo nem cria membership paralelo", async () => {
  const source = await readFile(
    new URL("../../apps/app/lib/executar/distribution.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /@repo\/collaboration/);
  assert.match(source, /@repo\/notifications/);
  assert.match(source, /framework: "Expo"/);
  assert.doesNotMatch(source, /from ["']expo/);
  assert.doesNotMatch(source, /supabase\.auth|createMembership/);
});

test("página deriva organização e usuário diretamente da sessão Clerk", async () => {
  const page = await readFile(
    new URL("../../apps/app/app/(authenticated)/page.tsx", import.meta.url),
    "utf8"
  );

  assert.match(page, /const \{ orgId, userId \} = await auth\(\)/);
  assert.match(page, /organizationId=\{orgId\}/);
  assert.match(page, /userId=\{userId\}/);
  assert.match(page, /LIVEBLOCKS_SECRET/);
  assert.match(page, /NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID/);
  assert.doesNotMatch(page, /supabase\.auth|memberships\.create/);
});

test("interface oferece presença, comentários e notificações no mesmo plano", async () => {
  // Achado da correção estrutural de 02/09/2026: o painel de
  // colaboração foi extraído pra executar-collaboration-panel.tsx, e os 6
  // laços de sincronização (incluindo o listener de `storage` entre abas)
  // pra use-sincronizacao-remota.ts.
  const [collaborationPanel, sincronizacao] = await Promise.all([
    readFile(
      new URL(
        "../../apps/app/app/(authenticated)/components/executar-collaboration-panel.tsx",
        import.meta.url
      ),
      "utf8"
    ),
    readFile(
      new URL(
        "../../apps/app/lib/executar/use-sincronizacao-remota.ts",
        import.meta.url
      ),
      "utf8"
    ),
  ]);
  const surface = `${collaborationPanel}\n${sincronizacao}`;

  for (const expected of [
    "Presença no projeto",
    "Avisos operacionais",
    "Comentários por entrega",
    "registrarComentario(state, actor",
    "marcarNotificacaoLida(state, actor",
    "receberAtualizacaoCompartilhada",
    'window.addEventListener("storage"',
    "o estado local foi preservado",
  ]) {
    assert.ok(surface.includes(expected), `Ausente na interface: ${expected}`);
  }
});

test("landing page reutiliza apps/web e remove provas sociais inventadas", async () => {
  const page = await readFile(
    new URL("../../apps/web/app/[locale]/(home)/page.tsx", import.meta.url),
    "utf8"
  );
  const hero = await readFile(
    new URL(
      "../../apps/web/app/[locale]/(home)/components/hero.tsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(page, /EXECUTAR · Próximo 1 por vez/);
  assert.match(hero, /Próximo 1 por vez/);
  assert.match(hero, /Abrir o EXECUTAR/);
  assert.doesNotMatch(page, /<Stats|<Testimonials|<Cases|showBetaFeature/);
  assert.doesNotMatch(hero, /blog\.getLatestPost/);
});

test("disponibilidade comercial não inventa preços nem cobrança ativa", async () => {
  const pricing = await readFile(
    new URL("../../apps/web/app/[locale]/pricing/page.tsx", import.meta.url),
    "utf8"
  );

  assert.match(pricing, /Preços ainda em definição/);
  assert.match(pricing, /INTEGRAÇÃO FINAL/);
  assert.match(pricing, /Stripe/);
  assert.doesNotMatch(pricing, /\$40|\/ month|checkout\.sessions/);
});

test("superfície GTM distingue mobile planejado de aplicativo disponível", async () => {
  const faq = await readFile(
    new URL(
      "../../apps/web/app/[locale]/(home)/components/faq.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const header = await readFile(
    new URL(
      "../../apps/web/app/[locale]/components/header/index.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const footer = await readFile(
    new URL(
      "../../apps/web/app/[locale]/components/footer.tsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(faq, /Android e iOS já está disponível/);
  assert.match(faq, /Ainda não/);
  assert.match(header, />EXECUTAR<\/p>/);
  assert.match(footer, />EXECUTAR<\/strong>/);
  assert.doesNotMatch(footer, /legal\.getPostsMeta|This is the start/);
});

test("metadata compartilhada apresenta EXECUTAR sem atribuições fictícias", async () => {
  const metadata = await readFile(
    new URL("../../packages/seo/metadata.ts", import.meta.url),
    "utf8"
  );

  assert.match(metadata, /applicationName = "EXECUTAR"/);
  assert.match(metadata, /publisher = "EXECUTAR"/);
  assert.match(metadata, /locale: "pt_BR"/);
  assert.doesNotMatch(metadata, /name: "Vercel"|@vercel/);
});

test("TypeScript permite extensão explícita usada pelo runner Node", async () => {
  const config = JSON.parse(
    await readFile(
      new URL("../../apps/app/tsconfig.json", import.meta.url),
      "utf8"
    )
  );

  assert.equal(config.compilerOptions.allowImportingTsExtensions, true);
});

test("provider Liveblocks reutilizado limita a sala ao projeto do tenant", async () => {
  const provider = await readFile(
    new URL(
      "../../apps/app/app/(authenticated)/components/collaboration-provider.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const component = await readFile(
    new URL(
      "../../apps/app/app/(authenticated)/components/executar-operacional.tsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(provider, /id=\{`\$\{orgId\}:\$\{projectId\}`\}/);
  assert.match(component, /collaborationAvailable \?/);
  assert.match(component, /projectId=\{state\.activeProjectId\}/);
});

test("notificações Knock reutilizam provider existente somente com configuração", async () => {
  const layout = await readFile(
    new URL("../../apps/app/app/(authenticated)/layout.tsx", import.meta.url),
    "utf8"
  );
  const component = await readFile(
    new URL(
      "../../apps/app/app/(authenticated)/components/executar-operacional.tsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(layout, /<NotificationsProvider userId=\{user\.id\}>/);
  assert.match(
    component,
    /externalNotificationsAvailable && <NotificationsTrigger/
  );
});

test("sugestões de menção retornam userId Clerk e não ID de membership", async () => {
  const action = await readFile(
    new URL("../../apps/app/app/actions/users/search.ts", import.meta.url),
    "utf8"
  );

  assert.match(action, /user\.publicUserData\?\.userId/);
  assert.match(action, /id: userId/);
  assert.doesNotMatch(action, /id: user\.id/);
});
