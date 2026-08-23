import { execFileSync } from "node:child_process";

const RESUMABLE_ERROR_PATTERN =
  /DatabaseResumingException|DatabaseUnavailableException/;
const CROSS_TENANT_ERROR_PATTERN = /42501|outra identidade|outra organização/i;
const required = [
  "AWS_REGION",
  "AURORA_DATABASE",
  "AURORA_MASTER_SECRET_ARN",
  "AURORA_RESOURCE_ARN",
  "AURORA_RUNTIME_SECRET_ARN",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Variável obrigatória ausente: ${key}`);
  }
}

const suffix = String(process.env.SMOKE_ID ?? Date.now()).replace(
  /[^A-Za-z0-9_-]/g,
  ""
);
const organizationA = `org_ci_a_${suffix}`;
const organizationB = `org_ci_b_${suffix}`;
const userA = `user_ci_a_${suffix}`;
const userB = `user_ci_b_${suffix}`;
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function parameter(name, value) {
  return {
    name,
    value: value === null ? { isNull: true } : { stringValue: value },
  };
}

async function execute(secretArn, sql, parameters = []) {
  let lastError;
  const args = [
    "rds-data",
    "execute-statement",
    "--region",
    process.env.AWS_REGION,
    "--database",
    process.env.AURORA_DATABASE,
    "--resource-arn",
    process.env.AURORA_RESOURCE_ARN,
    "--secret-arn",
    secretArn,
    "--sql",
    sql,
    "--format-records-as",
    "JSON",
    "--output",
    "json",
  ];

  if (parameters.length) {
    args.push("--parameters", JSON.stringify(parameters));
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return JSON.parse(
        execFileSync("aws", args, {
          encoding: "utf8",
          maxBuffer: 10 * 1024 * 1024,
          stdio: ["ignore", "pipe", "pipe"],
        })
      );
    } catch (error) {
      lastError = error;
      const message = `${error.stderr ?? ""}${error.message ?? ""}`;

      if (!RESUMABLE_ERROR_PATTERN.test(message)) {
        throw error;
      }

      await sleep(Math.min(15_000, 1000 * 2 ** attempt));
    }
  }

  throw lastError;
}

function value(response, field = "result") {
  const records = JSON.parse(response.formattedRecords ?? "[]");
  return records[0]?.[field];
}

const payload = {
  organization_id: organizationA,
  actor_user_id: userA,
  expected_revision: -1,
  revision: 0,
  active_project_id: "smoke",
  projects: [
    {
      organization_id: organizationA,
      project_id: "smoke",
      name: "Smoke CI",
      daily_capacity_minutes: 60,
    },
  ],
  deliveries: [
    {
      organization_id: organizationA,
      project_id: "smoke",
      delivery_id: "SMOKE-01",
      title: "Validar isolamento Aurora",
      front: "Infraestrutura",
      operational_date: "23/08",
      estimate_minutes: 15,
      stage: 1,
      definition_of_done: "RLS validada",
      status: "READY",
      started_steps: 0,
    },
  ],
  dependencies: [],
  events: [],
  state: {
    organizationId: organizationA,
    projects: [
      {
        id: "smoke",
        name: "Smoke CI",
        tasks: [
          {
            id: "SMOKE-01",
            title: "Validar isolamento Aurora",
            front: "Infraestrutura",
            date: "23/08",
            mins: 15,
            deps: [],
            stage: 1,
          },
        ],
        dailyCapacityMinutes: 60,
      },
    ],
    activeProjectId: "smoke",
    done: [],
    focus: null,
    evidence: [],
    started: {},
    collaboration: {
      presence: [],
      comments: [],
      notificationReads: [],
    },
    events: [],
    revision: 0,
  },
};
const actorParameters = (organizationId, userId) => [
  parameter("organization_id", organizationId),
  parameter("actor_user_id", userId),
];

try {
  const direct = await execute(
    process.env.AURORA_RUNTIME_SECRET_ARN,
    "select count(*)::text as result from public.executar_organizations"
  );

  if (value(direct) !== "0") {
    throw new Error("RLS permitiu leitura direta sem contexto autenticado.");
  }

  await execute(
    process.env.AURORA_RUNTIME_SECRET_ARN,
    "select public.executar_persistir_estado(cast(:organization_id as text), cast(:actor_user_id as text), cast(:payload as jsonb)) as result",
    [
      ...actorParameters(organizationA, userA),
      parameter("payload", JSON.stringify(payload)),
    ]
  );

  const loadedA = await execute(
    process.env.AURORA_RUNTIME_SECRET_ARN,
    "select public.executar_carregar_estado(cast(:organization_id as text), cast(:actor_user_id as text)) as result",
    actorParameters(organizationA, userA)
  );
  const stateA = value(loadedA);

  if (stateA?.organizationId !== organizationA) {
    throw new Error("A organização A não recuperou o próprio estado.");
  }

  const loadedB = await execute(
    process.env.AURORA_RUNTIME_SECRET_ARN,
    "select public.executar_carregar_estado(cast(:organization_id as text), cast(:actor_user_id as text)) as result",
    actorParameters(organizationB, userB)
  );

  if (value(loadedB) !== null) {
    throw new Error("A organização B conseguiu ler o estado da organização A.");
  }

  let crossTenantRejected = false;

  try {
    await execute(
      process.env.AURORA_RUNTIME_SECRET_ARN,
      "select public.executar_persistir_estado(cast(:organization_id as text), cast(:actor_user_id as text), cast(:payload as jsonb)) as result",
      [
        ...actorParameters(organizationB, userB),
        parameter("payload", JSON.stringify(payload)),
      ]
    );
  } catch (error) {
    crossTenantRejected = CROSS_TENANT_ERROR_PATTERN.test(
      `${error.stderr ?? ""}${error.message ?? ""}`
    );
  }

  if (!crossTenantRejected) {
    throw new Error("A escrita cruzada entre organizações não foi rejeitada.");
  }

  console.log(
    "Smoke Aurora PASSOU: RLS direta, leitura e escrita multi-tenant."
  );
} finally {
  await execute(
    process.env.AURORA_MASTER_SECRET_ARN,
    "delete from public.executar_organizations where organization_id = cast(:organization_id as text)",
    [parameter("organization_id", organizationA)]
  ).catch(() => undefined);
}
