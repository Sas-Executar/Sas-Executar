import "server-only";

import {
  ExecuteStatementCommand,
  type ExecuteStatementCommandInput,
  RDSDataClient,
  type SqlParameter,
} from "@aws-sdk/client-rds-data";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import {
  type AprovacaoCopiloto,
  type AtorOperacional,
  type EstadoOperacional,
  FERRAMENTAS_OPERACIONAIS,
} from "./domain";
import {
  caminhoEvidenciaOrganizacao,
  prepararLotePersistencia,
} from "./integration-contract";
import {
  ErroPersistenciaRemota,
  type PersistenciaOperacionalRemota,
} from "./remote-persistence";

const STORAGE_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONFLICT_ERROR_PATTERN = /40001|Conflito de revisão/i;
const AUTHORIZATION_ERROR_PATTERN = /42501|AccessDenied|Forbidden/i;
const NOT_FOUND_ERROR_PATTERN = /NoSuchKey|NotFound/i;
const UNAVAILABLE_ERROR_PATTERN =
  /DatabaseResuming|DatabaseUnavailable|HttpEndpointNotEnabled|InvalidSecret/i;
const RESUMABLE_ERROR_PATTERN =
  /DatabaseResumingException|DatabaseUnavailableException/;
const PRECONDITION_ERROR_PATTERN = /PreconditionFailed/;
const EVIDENCE_MAX_BYTES = 2_500_000;

interface ConfiguracaoAws {
  readonly database: string;
  readonly evidenceBucket: string;
  readonly region: string;
  readonly resourceArn: string;
  readonly roleArn: string;
  readonly runtimeSecretArn: string;
}

interface ClientesAws {
  readonly key: string;
  readonly rds: RDSDataClient;
  readonly s3: S3Client;
}

let cachedClients: ClientesAws | undefined;

function configuracaoAws(): ConfiguracaoAws {
  const configuration = {
    region: process.env.AWS_REGION,
    roleArn: process.env.AWS_ROLE_ARN,
    database: process.env.AURORA_DATABASE,
    resourceArn: process.env.AURORA_RESOURCE_ARN,
    runtimeSecretArn: process.env.AURORA_RUNTIME_SECRET_ARN,
    evidenceBucket: process.env.EVIDENCE_BUCKET,
  };

  if (Object.values(configuration).some((value) => !value?.trim())) {
    throw new ErroPersistenciaRemota(
      "A integração AWS ainda não foi configurada neste ambiente.",
      503,
      "INTEGRACAO_AWS_NAO_CONFIGURADA"
    );
  }

  return configuration as ConfiguracaoAws;
}

function clientesAws(configuration: ConfiguracaoAws): ClientesAws {
  const key = `${configuration.region}:${configuration.roleArn}`;

  if (cachedClients?.key === key) {
    return cachedClients;
  }

  const credentials =
    process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN
      ? awsCredentialsProvider({
          roleArn: configuration.roleArn,
          clientConfig: { region: configuration.region },
          roleSessionName: "executar-runtime",
        })
      : undefined;
  const options = {
    region: configuration.region,
    ...(credentials ? { credentials } : {}),
  };

  cachedClients = {
    key,
    rds: new RDSDataClient(options),
    s3: new S3Client(options),
  };

  return cachedClients;
}

function mensagemErro(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function nomeErro(error: unknown): string {
  return error && typeof error === "object" && "name" in error
    ? String(error.name)
    : "";
}

function erroPersistencia(error: unknown): ErroPersistenciaRemota {
  if (error instanceof ErroPersistenciaRemota) {
    return error;
  }

  const name = nomeErro(error);
  const message = mensagemErro(error);

  if (CONFLICT_ERROR_PATTERN.test(message)) {
    return new ErroPersistenciaRemota(
      "Outra sessão modificou este projeto; revise antes de sincronizar.",
      409,
      "CONFLITO_REVISAO"
    );
  }

  if (AUTHORIZATION_ERROR_PATTERN.test(`${name} ${message}`)) {
    return new ErroPersistenciaRemota(
      "A operação não foi autorizada para esta organização.",
      403,
      "OPERACAO_AWS_NAO_AUTORIZADA"
    );
  }

  if (NOT_FOUND_ERROR_PATTERN.test(`${name} ${message}`)) {
    return new ErroPersistenciaRemota(
      "A evidência solicitada não foi encontrada.",
      404,
      "EVIDENCIA_NAO_ENCONTRADA"
    );
  }

  if (UNAVAILABLE_ERROR_PATTERN.test(`${name} ${message}`)) {
    return new ErroPersistenciaRemota(
      "O Aurora está iniciando ou temporariamente indisponível.",
      503,
      "AURORA_INDISPONIVEL"
    );
  }

  return new ErroPersistenciaRemota(
    "Não foi possível concluir a operação na AWS.",
    502,
    "ERRO_AWS"
  );
}

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function executarSql(
  rds: RDSDataClient,
  input: ExecuteStatementCommandInput
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 7; attempt += 1) {
    try {
      return await rds.send(new ExecuteStatementCommand(input));
    } catch (error) {
      lastError = error;

      if (!RESUMABLE_ERROR_PATTERN.test(nomeErro(error))) {
        throw erroPersistencia(error);
      }

      await sleep(Math.min(10_000, 500 * 2 ** attempt));
    }
  }

  throw erroPersistencia(lastError);
}

function parametroTexto(name: string, value: string | null): SqlParameter {
  return value === null
    ? { name, value: { isNull: true } }
    : { name, value: { stringValue: value } };
}

function parametroLongo(name: string, value: number): SqlParameter {
  return { name, value: { longValue: value } };
}

function valorResultado(
  formattedRecords: string | undefined,
  field: string
): unknown {
  const records = JSON.parse(formattedRecords ?? "[]") as Record<
    string,
    unknown
  >[];
  const value = records[0]?.[field];

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

async function chamarFuncao(
  configuration: ConfiguracaoAws,
  rds: RDSDataClient,
  sql: string,
  parameters: SqlParameter[],
  field = "result"
): Promise<unknown> {
  const response = await executarSql(rds, {
    database: configuration.database,
    formatRecordsAs: "JSON",
    parameters,
    resourceArn: configuration.resourceArn,
    secretArn: configuration.runtimeSecretArn,
    sql,
  });

  return valorResultado(response.formattedRecords, field);
}

function parametrosAtor(actor: AtorOperacional): SqlParameter[] {
  return [
    parametroTexto("organization_id", actor.organizationId),
    parametroTexto("actor_user_id", actor.userId),
  ];
}

function validarAprovacao(
  approval: AprovacaoCopiloto,
  actor: AtorOperacional
): void {
  const contract = FERRAMENTAS_OPERACIONAIS.find(
    (item) => item.name === approval.tool
  );
  const expectedId = `${approval.organizationId}:${approval.projectId}:${approval.tool}:${approval.taskId ?? "projeto"}:${approval.expectedRevision}`;

  if (
    approval.organizationId !== actor.organizationId ||
    !contract?.requiresApproval ||
    approval.id !== expectedId ||
    approval.input.name !== approval.tool ||
    approval.input.organizationId !== actor.organizationId ||
    approval.input.projectId !== approval.projectId ||
    approval.input.expectedRevision !== approval.expectedRevision ||
    (approval.input.taskId ?? null) !== approval.taskId ||
    !Number.isSafeInteger(approval.expectedRevision)
  ) {
    throw new ErroPersistenciaRemota(
      "A proposta de aprovação não pertence à sessão autenticada.",
      403,
      "APROVACAO_INVALIDA"
    );
  }
}

function caminhoStorage(path: string, organizationId: string): string {
  const segments = path.split("/");

  if (
    segments.length !== 4 ||
    segments[0] !== organizationId ||
    segments.some(
      (segment) =>
        !STORAGE_SEGMENT_PATTERN.test(segment) || segment.includes("..")
    )
  ) {
    throw new ErroPersistenciaRemota(
      "O arquivo não pertence à organização autenticada.",
      403,
      "EVIDENCIA_NAO_AUTORIZADA"
    );
  }

  return path;
}

export function criarPersistenciaAws(
  actor: AtorOperacional
): PersistenciaOperacionalRemota {
  const configuration = configuracaoAws();
  const { rds, s3 } = clientesAws(configuration);

  return {
    runLedger: {
      async iniciar(input) {
        const result = await chamarFuncao(
          configuration,
          rds,
          "select public.executar_iniciar_run(cast(:organization_id as text), cast(:actor_user_id as text), cast(:project_id as text), cast(:run_id as text), cast(:run_type as text), cast(:idempotency_key as text), cast(:lock_key as text)) as result",
          [
            ...parametrosAtor(actor),
            parametroTexto("project_id", input.projectId),
            parametroTexto("run_id", input.runId),
            parametroTexto("run_type", input.type),
            parametroTexto("idempotency_key", input.idempotencyKey),
            parametroTexto("lock_key", input.lockKey),
          ]
        );
        const started = result as {
          replayed?: boolean;
          result?: Readonly<Record<string, unknown>>;
          run_id?: string;
          status?: "FAILED" | "RUNNING" | "SUCCEEDED";
        } | null;

        if (
          typeof started?.replayed !== "boolean" ||
          started.run_id !== input.runId ||
          !["FAILED", "RUNNING", "SUCCEEDED"].includes(started.status ?? "") ||
          !started.result ||
          typeof started.result !== "object" ||
          Array.isArray(started.result)
        ) {
          throw new ErroPersistenciaRemota(
            "O Aurora retornou um run inválido.",
            502,
            "RUN_AGENTE_INVALIDO"
          );
        }

        return {
          replayed: started.replayed,
          result: started.result,
          runId: started.run_id,
          status: started.status as "FAILED" | "RUNNING" | "SUCCEEDED",
        };
      },

      async reservarEfeito(reference, effectKey) {
        const result = await chamarFuncao(
          configuration,
          rds,
          "select public.executar_reservar_efeito_run(cast(:organization_id as text), cast(:actor_user_id as text), cast(:project_id as text), cast(:run_id as text), cast(:effect_key as text)) as result",
          [
            ...parametrosAtor(actor),
            parametroTexto("project_id", reference.projectId),
            parametroTexto("run_id", reference.runId),
            parametroTexto("effect_key", effectKey),
          ]
        );

        if (result !== true) {
          throw new ErroPersistenciaRemota(
            "O efeito do Agent-007 não foi reservado.",
            502,
            "EFEITO_AGENTE_NAO_RESERVADO"
          );
        }
      },

      async finalizarEfeito(reference, effectKey, status, errorCode) {
        const result = await chamarFuncao(
          configuration,
          rds,
          "select public.executar_finalizar_efeito_run(cast(:organization_id as text), cast(:actor_user_id as text), cast(:project_id as text), cast(:run_id as text), cast(:effect_key as text), cast(:status as text), cast(:error_code as text)) as result",
          [
            ...parametrosAtor(actor),
            parametroTexto("project_id", reference.projectId),
            parametroTexto("run_id", reference.runId),
            parametroTexto("effect_key", effectKey),
            parametroTexto("status", status),
            parametroTexto("error_code", errorCode ?? null),
          ]
        );

        if (result !== true) {
          throw new ErroPersistenciaRemota(
            "O efeito do Agent-007 não foi finalizado.",
            502,
            "EFEITO_AGENTE_NAO_FINALIZADO"
          );
        }
      },

      async finalizar(reference, runResult) {
        const result = await chamarFuncao(
          configuration,
          rds,
          "select public.executar_finalizar_run(cast(:organization_id as text), cast(:actor_user_id as text), cast(:project_id as text), cast(:run_id as text), cast(:run_result as jsonb)) as result",
          [
            ...parametrosAtor(actor),
            parametroTexto("project_id", reference.projectId),
            parametroTexto("run_id", reference.runId),
            parametroTexto("run_result", JSON.stringify(runResult)),
          ]
        );

        if (result !== true) {
          throw new ErroPersistenciaRemota(
            "O run do Agent-007 não foi finalizado.",
            502,
            "RUN_AGENTE_NAO_FINALIZADO"
          );
        }
      },

      async falhar(reference, errorCode) {
        const result = await chamarFuncao(
          configuration,
          rds,
          "select public.executar_falhar_run(cast(:organization_id as text), cast(:actor_user_id as text), cast(:project_id as text), cast(:run_id as text), cast(:error_code as text)) as result",
          [
            ...parametrosAtor(actor),
            parametroTexto("project_id", reference.projectId),
            parametroTexto("run_id", reference.runId),
            parametroTexto("error_code", errorCode),
          ]
        );

        if (result !== true) {
          throw new ErroPersistenciaRemota(
            "A falha do Agent-007 não foi registrada.",
            502,
            "RUN_AGENTE_FALHA_NAO_REGISTRADA"
          );
        }
      },
    },

    async carregar() {
      const result = await chamarFuncao(
        configuration,
        rds,
        "select public.executar_carregar_estado(cast(:organization_id as text), cast(:actor_user_id as text)) as result",
        parametrosAtor(actor)
      );

      if (result === null || result === undefined) {
        return null;
      }

      if (
        typeof result !== "object" ||
        Array.isArray(result) ||
        (result as EstadoOperacional).organizationId !== actor.organizationId
      ) {
        throw new ErroPersistenciaRemota(
          "O estado remoto não pertence à organização autenticada.",
          409,
          "ESTADO_REMOTO_INVALIDO"
        );
      }

      return result as EstadoOperacional;
    },

    async salvar(state, authenticatedActor, expectedRevision) {
      if (
        !Number.isSafeInteger(expectedRevision) ||
        expectedRevision < -1 ||
        expectedRevision > state.revision
      ) {
        throw new ErroPersistenciaRemota(
          "A revisão esperada para sincronização é inválida.",
          400,
          "REVISAO_INVALIDA"
        );
      }

      const batch = prepararLotePersistencia(
        state,
        authenticatedActor,
        Math.max(expectedRevision, 0)
      );
      const payload = {
        organization_id: batch.organizationId,
        actor_user_id: batch.actorId,
        expected_revision: expectedRevision,
        revision: batch.revision,
        active_project_id: batch.activeProjectId,
        projects: batch.projects,
        deliveries: batch.deliveries,
        dependencies: batch.dependencies,
        events: batch.sync.events,
        state,
      };
      const result = await chamarFuncao(
        configuration,
        rds,
        "select public.executar_persistir_estado(cast(:organization_id as text), cast(:actor_user_id as text), cast(:payload as jsonb)) as result",
        [
          ...parametrosAtor(authenticatedActor),
          parametroTexto("payload", JSON.stringify(payload)),
        ]
      );
      const saved = result as {
        organization_id?: string;
        revision?: number;
      } | null;

      if (
        saved?.organization_id !== authenticatedActor.organizationId ||
        saved.revision !== state.revision
      ) {
        throw new ErroPersistenciaRemota(
          "A confirmação remota não corresponde à organização ou revisão.",
          409,
          "CONFIRMACAO_INVALIDA"
        );
      }

      return { revision: saved.revision };
    },

    async solicitarAprovacao(approval) {
      validarAprovacao(approval, actor);
      const result = await chamarFuncao(
        configuration,
        rds,
        "select public.executar_solicitar_aprovacao(cast(:organization_id as text), cast(:actor_user_id as text), cast(:project_id as text), cast(:tool_name as text), cast(:delivery_id as text), cast(:expected_revision as bigint), cast(:input as jsonb))::text as result",
        [
          ...parametrosAtor(actor),
          parametroTexto("project_id", approval.projectId),
          parametroTexto("tool_name", approval.tool),
          parametroTexto("delivery_id", approval.taskId),
          parametroLongo("expected_revision", approval.expectedRevision),
          parametroTexto("input", JSON.stringify(approval.input)),
        ]
      );

      if (!(typeof result === "string" && UUID_PATTERN.test(result))) {
        throw new ErroPersistenciaRemota(
          "A aprovação não foi registrada pelo servidor.",
          502,
          "APROVACAO_NAO_PERSISTIDA"
        );
      }

      return result;
    },

    async aprovar(approvalId, approved) {
      if (!UUID_PATTERN.test(approvalId)) {
        throw new ErroPersistenciaRemota(
          "O identificador da aprovação é inválido.",
          400,
          "APROVACAO_INVALIDA"
        );
      }

      const result = await chamarFuncao(
        configuration,
        rds,
        "select public.executar_resolver_aprovacao(cast(:organization_id as text), cast(:actor_user_id as text), cast(:approval_id as uuid), cast(:approved as boolean)) as result",
        [
          ...parametrosAtor(actor),
          parametroTexto("approval_id", approvalId),
          { name: "approved", value: { booleanValue: approved } },
        ]
      );

      if (result !== true) {
        throw new ErroPersistenciaRemota(
          "A aprovação expirou, já foi utilizada ou pertence a outra organização.",
          409,
          "APROVACAO_EXPIRADA"
        );
      }
    },

    async enviarEvidencia(state, authenticatedActor, taskId, file) {
      if (
        !Number.isSafeInteger(file.size) ||
        file.size <= 0 ||
        file.size > EVIDENCE_MAX_BYTES
      ) {
        throw new ErroPersistenciaRemota(
          "O arquivo da evidência deve ter entre 1 byte e 2,5 MB.",
          400,
          "EVIDENCIA_INVALIDA"
        );
      }

      const path = caminhoStorage(
        caminhoEvidenciaOrganizacao(
          state,
          authenticatedActor,
          taskId,
          file.name
        ),
        authenticatedActor.organizationId
      );

      try {
        await s3.send(
          new PutObjectCommand({
            Body: new Uint8Array(await file.arrayBuffer()),
            Bucket: configuration.evidenceBucket,
            ContentLength: file.size,
            ContentType: file.type || "application/octet-stream",
            IfNoneMatch: "*",
            Key: path,
            Metadata: {
              organization: authenticatedActor.organizationId,
              project: state.activeProjectId,
              task: taskId,
              user: authenticatedActor.userId,
            },
          })
        );
      } catch (error) {
        if (PRECONDITION_ERROR_PATTERN.test(nomeErro(error))) {
          throw new ErroPersistenciaRemota(
            "Já existe uma evidência com este nome nesta entrega.",
            409,
            "EVIDENCIA_DUPLICADA"
          );
        }

        throw erroPersistencia(error);
      }

      return { path };
    },

    async baixarEvidencia(path) {
      const safePath = caminhoStorage(path, actor.organizationId);

      try {
        const object = await s3.send(
          new GetObjectCommand({
            Bucket: configuration.evidenceBucket,
            Key: safePath,
          })
        );

        if (!object.Body) {
          throw new ErroPersistenciaRemota(
            "A evidência solicitada não possui conteúdo.",
            404,
            "EVIDENCIA_NAO_ENCONTRADA"
          );
        }

        const bytes = await object.Body.transformToByteArray();
        const body = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer;
        const fileName = safePath.split("/").at(-1) ?? "evidencia";
        const headers = new Headers({
          "Cache-Control": "private, no-store",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Type": object.ContentType ?? "application/octet-stream",
        });

        if (object.ContentLength !== undefined) {
          headers.set("Content-Length", String(object.ContentLength));
        }

        return new Response(body, { headers, status: 200 });
      } catch (error) {
        throw erroPersistencia(error);
      }
    },
  };
}
