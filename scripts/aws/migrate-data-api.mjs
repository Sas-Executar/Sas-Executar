import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RESUMABLE_ERROR_PATTERN =
  /DatabaseResumingException|DatabaseUnavailableException/;
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

const connection = {
  resourceArn: process.env.AURORA_RESOURCE_ARN,
  secretArn: process.env.AURORA_MASTER_SECRET_ARN,
};
const databaseConnection = {
  ...connection,
  database: process.env.AURORA_DATABASE,
};

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function aws(operation, input = {}, { database = true } = {}) {
  let lastError;
  const base = database ? databaseConnection : connection;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const result = execFileSync(
        "aws",
        [
          "rds-data",
          operation,
          "--region",
          process.env.AWS_REGION,
          "--cli-input-json",
          "file:///dev/stdin",
          "--output",
          "json",
        ],
        {
          encoding: "utf8",
          input: JSON.stringify({ ...base, ...input }),
          maxBuffer: 10 * 1024 * 1024,
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

      return result.trim() ? JSON.parse(result) : {};
    } catch (error) {
      lastError = error;
      const message = `${error.stderr ?? ""}${error.message ?? ""}`;

      if (!RESUMABLE_ERROR_PATTERN.test(message)) {
        throw error;
      }

      await sleep(Math.min(30_000, 1000 * 2 ** attempt));
    }
  }

  throw lastError;
}

function execute(
  sql,
  transactionId,
  parameters = [],
  continueAfterTimeout = false
) {
  const input = { sql };

  if (transactionId) {
    input.transactionId = transactionId;
  }

  if (parameters.length) {
    input.parameters = parameters;
  }

  if (continueAfterTimeout) {
    input.continueAfterTimeout = true;
  }

  return aws("execute-statement", input);
}

async function ensureRuntimeRole() {
  const secretRaw = execFileSync(
    "aws",
    [
      "secretsmanager",
      "get-secret-value",
      "--region",
      process.env.AWS_REGION,
      "--secret-id",
      process.env.AURORA_RUNTIME_SECRET_ARN,
      "--query",
      "SecretString",
      "--output",
      "text",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  const secret = JSON.parse(secretRaw);
  const passwordLiteral = secret.password.replaceAll("'", "''");
  const sql = `do $$ begin if not exists (select 1 from pg_roles where rolname = 'executar_runtime') then create role executar_runtime login password '${passwordLiteral}'; else alter role executar_runtime password '${passwordLiteral}'; end if; end $$`;

  await execute(sql);
}

await ensureRuntimeRole();
await execute(
  "create table if not exists public._executar_migrations (migration_id text primary key, checksum text not null, applied_at timestamptz not null default now())"
);

const directory = join(process.cwd(), "infra", "aws", "migrations");
const files = readdirSync(directory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of files) {
  const source = readFileSync(join(directory, file), "utf8").trim();
  const checksum = createHash("sha256").update(source).digest("hex");
  const existing = await execute(
    "select checksum from public._executar_migrations where migration_id = :id",
    undefined,
    [{ name: "id", value: { stringValue: file } }]
  );

  if (existing.records?.length) {
    const appliedChecksum = existing.records[0][0]?.stringValue;

    if (appliedChecksum !== checksum) {
      throw new Error(`A migração aplicada foi alterada: ${file}`);
    }

    console.log(`Migração já aplicada: ${file}`);
    continue;
  }

  const { transactionId } = await aws("begin-transaction");

  try {
    for (const statement of source
      .split(/^\s*-- statement-breakpoint\s*$/mu)
      .map((item) => item.trim())
      .filter(Boolean)) {
      await execute(statement, transactionId, [], true);
    }

    await execute(
      "insert into public._executar_migrations (migration_id, checksum) values (:id, :checksum)",
      transactionId,
      [
        { name: "id", value: { stringValue: file } },
        { name: "checksum", value: { stringValue: checksum } },
      ]
    );
    await aws("commit-transaction", { transactionId }, { database: false });
    console.log(`Migração aplicada: ${file}`);
  } catch (error) {
    await aws(
      "rollback-transaction",
      { transactionId },
      { database: false }
    ).catch(() => undefined);
    throw error;
  }
}
