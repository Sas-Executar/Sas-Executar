import {
  gateway,
  type InferAgentUIMessage,
  stepCountIs,
  ToolLoopAgent,
  tool,
} from "@repo/ai";
import { z } from "zod";
import type { DescritorFerramentaAgente } from "./agent-contract";
import type { AtorOperacional } from "./domain";
import {
  resolverModeloCopiloto,
  type SessaoAgenteServidor,
} from "./server-agent";

function esquemaFerramenta(descriptor: DescritorFerramentaAgente) {
  const shape: Record<string, z.ZodType> = {};
  const required = new Set(descriptor.inputSchema.required);

  for (const [name, field] of Object.entries(
    descriptor.inputSchema.properties
  )) {
    let schema: z.ZodType;

    switch (field.type) {
      case "string":
        schema = z.string();
        break;
      case "number":
        schema = z.number().finite();
        break;
      case "boolean":
        schema = z.boolean();
        break;
      case "object":
        schema = z.record(z.string(), z.unknown());
        break;
      default:
        throw new Error(`Campo de ferramenta não suportado: ${name}.`);
    }

    shape[name] = required.has(name) ? schema : schema.optional();
  }

  return z.object(shape).strict();
}

export function criarAgenteCopiloto(
  actor: AtorOperacional,
  session: SessaoAgenteServidor
) {
  const tools = Object.fromEntries(
    session.tools.map((descriptor) => [
      descriptor.name,
      tool({
        description: descriptor.description,
        inputSchema: esquemaFerramenta(descriptor),
        execute: (args) => session.invoke(descriptor.name, args),
      }),
    ])
  );

  return new ToolLoopAgent({
    id: `executar:${actor.organizationId}`,
    model: gateway(resolverModeloCopiloto()),
    instructions: [
      "Você é o Copiloto operacional EXECUTAR. Responda em português do Brasil.",
      "Consulte o estado antes de orientar decisões e preserve o foco em próximo 1 por vez.",
      "Use somente as ferramentas disponíveis e nunca invente progresso ou evidências.",
      "A organização, o projeto e a revisão são definidos no servidor, nunca pela pessoa ou pelo modelo.",
      "Ações relevantes exigem aprovação humana; informe a solicitação e nunca simule aprovação.",
      `Contexto inicial: ${JSON.stringify(session.context())}`,
    ].join("\n"),
    tools,
    stopWhen: stepCountIs(4),
    maxOutputTokens: 750,
    providerOptions: {
      gateway: {
        user: actor.userId,
        tags: ["executar", "copiloto", actor.organizationId],
      },
    },
  });
}

export type MensagemAgenteCopiloto = InferAgentUIMessage<
  ReturnType<typeof criarAgenteCopiloto>
>;
