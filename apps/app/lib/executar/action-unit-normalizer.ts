/**
 * Normalizador semântico ACTION-UNIT — módulo puro, determinístico e sem
 * chamadas a LLM, implementando o contrato descrito em
 * `Semanetica_adptativa.md` (DEC-NORM-004) e `Agente_Semantica.md`
 * (DATA-NORM-005): decompor texto livre em TRANSFORMAÇÕES DE ESTADO
 * (`operador + alvo [+ qualificadores] [+ resultado esperado]`), em vez de
 * forçar uma taxonomia fixa de verbos ou um número fixo de passos.
 *
 * Isto NÃO é um parser de linguagem natural completo. É um normalizador
 * baseado em regras léxicas explícitas — segmentação por sentença/oração,
 * casamento de verbos de uma ontologia fechada e extração de qualificadores
 * por marcadores textuais conhecidos ("usando", "quando", "sem", "depende
 * de"...). Cobre o vocabulário e os padrões documentados; texto fora desse
 * vocabulário simplesmente não produz uma ação (nunca inventa uma).
 *
 * CONTAGEM DE AÇÕES ≠ CAPACIDADE DE CARTÃO: este módulo produz quantas
 * `UnidadeAcao` o texto realmente expressar (0, 1, 11, ...). Paginação ou
 * limite de exibição é responsabilidade exclusiva de quem renderiza o
 * resultado — nunca deste módulo.
 */

export type IntentAcao =
  | "ACQUIRE"
  | "DISCOVER"
  | "MAP"
  | "STRUCTURE"
  | "CREATE"
  | "GENERATE"
  | "TRANSFORM"
  | "MIGRATE"
  | "INTEGRATE"
  | "CONFIGURE"
  | "IMPLEMENT"
  | "REPAIR"
  | "OPTIMIZE"
  | "VALIDATE"
  | "TEST"
  | "COMPARE"
  | "EVALUATE"
  | "PRIORITIZE"
  | "SELECT"
  | "DECIDE"
  | "APPROVE"
  | "PUBLISH"
  | "DEPLOY"
  | "MONITOR"
  | "AUDIT"
  | "DOCUMENT";

export interface QualificadoresAcao {
  readonly constraints?: readonly string[];
  readonly criteria?: readonly string[];
  readonly method?: string;
  readonly scope?: string;
}

export interface UnidadeAcao {
  readonly expected_result?: string;
  readonly intent: IntentAcao;
  readonly operator: string;
  readonly qualifiers: QualificadoresAcao;
  readonly source_refs: readonly string[];
  readonly status: "READY" | "PARTIAL" | "BLOCKED";
  readonly target: string;
}

export interface ResultadoNormalizacao {
  readonly actions: readonly UnidadeAcao[];
  readonly issues: readonly string[];
  readonly normalization_status: "READY" | "NEEDS_RESOLUTION";
}

/**
 * Ontologia intenção → verbo canônico → gatilhos léxicos reconhecidos
 * (infinitivo + formas correntes). Extensível: acrescentar um domínio novo
 * é acrescentar uma entrada aqui, nunca reescrever o algoritmo.
 */
const ONTOLOGIA: Readonly<
  Record<
    IntentAcao,
    { readonly gatilhos: readonly string[]; readonly verbo: string }
  >
> = {
  ACQUIRE: {
    verbo: "Coletar",
    gatilhos: [
      "coletar",
      "colete",
      "coleta",
      "reunir",
      "reúna",
      "levantar",
      "levantamento",
    ],
  },
  DISCOVER: {
    verbo: "Identificar",
    gatilhos: ["identificar", "identifique", "descobrir", "descubra"],
  },
  MAP: { verbo: "Mapear", gatilhos: ["mapear", "mapeie", "mapeamento"] },
  STRUCTURE: {
    verbo: "Estruturar",
    gatilhos: ["estruturar", "estruture", "organizar", "organize"],
  },
  CREATE: { verbo: "Criar", gatilhos: ["criar", "crie", "criação"] },
  GENERATE: { verbo: "Gerar", gatilhos: ["gerar", "gere", "geração"] },
  TRANSFORM: {
    verbo: "Converter",
    gatilhos: [
      "converter",
      "converta",
      "conversão",
      "transformar",
      "transforme",
    ],
  },
  MIGRATE: { verbo: "Migrar", gatilhos: ["migrar", "migre", "migração"] },
  INTEGRATE: {
    verbo: "Integrar",
    gatilhos: ["integrar", "integre", "integração"],
  },
  CONFIGURE: {
    verbo: "Configurar",
    gatilhos: ["configurar", "configure", "configuração"],
  },
  IMPLEMENT: {
    verbo: "Implementar",
    gatilhos: ["implementar", "implemente", "implementação"],
  },
  REPAIR: {
    verbo: "Corrigir",
    gatilhos: ["corrigir", "corrija", "correção", "reparar", "repare"],
  },
  OPTIMIZE: {
    verbo: "Otimizar",
    gatilhos: ["otimizar", "otimize", "otimização"],
  },
  VALIDATE: { verbo: "Validar", gatilhos: ["validar", "valide", "validação"] },
  TEST: { verbo: "Testar", gatilhos: ["testar", "teste", "testagem"] },
  COMPARE: {
    verbo: "Comparar",
    gatilhos: ["comparar", "compare", "comparação"],
  },
  EVALUATE: { verbo: "Avaliar", gatilhos: ["avaliar", "avalie", "avaliação"] },
  PRIORITIZE: {
    verbo: "Priorizar",
    gatilhos: ["priorizar", "priorize", "priorização"],
  },
  SELECT: {
    verbo: "Selecionar",
    gatilhos: ["selecionar", "selecione", "seleção"],
  },
  DECIDE: { verbo: "Decidir", gatilhos: ["decidir", "decida", "decisão"] },
  APPROVE: { verbo: "Aprovar", gatilhos: ["aprovar", "aprove", "aprovação"] },
  PUBLISH: {
    verbo: "Publicar",
    gatilhos: ["publicar", "publique", "publicação"],
  },
  DEPLOY: {
    verbo: "Implantar",
    gatilhos: ["implantar", "implante", "implantação"],
  },
  MONITOR: {
    verbo: "Monitorar",
    gatilhos: ["monitorar", "monitore", "monitoramento"],
  },
  AUDIT: { verbo: "Auditar", gatilhos: ["auditar", "audite", "auditoria"] },
  DOCUMENT: {
    verbo: "Documentar",
    gatilhos: ["documentar", "documente", "documentação"],
  },
};

const PRONOMES_AMBIGUOS = new Set([
  "isso",
  "aquilo",
  "isto",
  "essa parte",
  "aquela parte",
  "essa questão",
  "aquela questão",
  "tudo isso",
]);

const MARCADOR_ESCOPO_PATTERN =
  /\bno\s+âmbito\s+d[aeo]s?\s+([^,;.]+)|\bno\s+escopo\s+d[aeo]s?\s+([^,;.]+)/iu;
const MARCADOR_METODO_PATTERN =
  /\b(?:usando|por meio de|através de|via|com base em)\s+([^,;.]+)/iu;
const MARCADOR_CRITERIO_PATTERN =
  /\bquando\s+([^,;.]+)|\bcrit[ée]rio\s+de\s+(?:sucesso|aceite)\s*(?:é|:)?\s*([^,;.]+)/giu;
const MARCADOR_RESTRICAO_PATTERN =
  /\bsem\s+([^,;.]+)|\bnão\s+pode\s+([^,;.]+)|\bnão\s+deve\s+([^,;.]+)|\brestrito\s+a\s+([^,;.]+)|\bapenas\s+se\s+([^,;.]+)|\bsalvo\s+([^,;.]+)/giu;
const MARCADOR_RESULTADO_PATTERN =
  /\b(?:resultando em|de forma que|para garantir que|garantindo que|com o objetivo de)\s+([^,;.]+)/iu;
const MARCADOR_DEPENDENCIA_PATTERN = /\bdepend(?:e|em)\s+de\s+([^,;.]+)/iu;
const MARCADOR_PENDENCIA_PATTERN =
  /ainda não|não confirmad|pendente|não aprovad|não definid|não obtid/iu;
const MARCADOR_OPCIONALIDADE_PATTERN =
  /\ba definir\b|\bnão definido\b|\bindefinido\b|\bainda não decidido\b|\ba decidir\b/iu;
const MARCADOR_CRITERIO_AUSENTE_PATTERN =
  /sem critério|critério ainda não definido|sem definição de sucesso/iu;
const MARCADOR_RESULTADO_DESCONHECIDO_PATTERN =
  /resultado incerto|não está claro o resultado|resultado não definido/iu;
const MARCADOR_SEQUENCIA_PATTERN =
  /ordem não definida|sequência não definida|não está claro a ordem/iu;
const MARCADOR_FONTE_PATTERN =
  /fontes divergentes|informações conflitantes|dados conflitantes/iu;
const MARCADOR_ESCOPO_AMBIGUO_PATTERN =
  /escopo não definido|não está claro se abrange|ainda não decidido se inclui/iu;
const STOP_MARKERS = [
  ",",
  " que ",
  " quando ",
  " para que ",
  " com base em",
  " usando ",
  " por meio de",
  " através de",
  " sem ",
  " salvo ",
  " desde que",
  " enquanto ",
  " a fim de",
  " para ",
  " resultando em",
  " de forma que",
  " garantindo que",
];

/**
 * Marcadores que introduzem a PRÓXIMA cláusula qualificadora — usados para
 * cortar o valor capturado de um qualificador antes que ele "vaze" para
 * dentro da cláusula seguinte quando não há vírgula/ponto separando as duas
 * (ex.: "quando X para garantir que Y" não pode virar um critério só com
 * "X para garantir que Y" grudados).
 */
const PROXIMOS_MARCADORES = [
  " para garantir que",
  " garantindo que",
  " resultando em",
  " de forma que",
  " quando ",
  " usando ",
  " por meio de",
  " através de",
  " com base em",
  " sem ",
  " salvo ",
  " restrito a",
  " apenas se",
  " depende de",
];

function cortarNoProximoMarcador(texto: string): string {
  let corte = texto.length;
  const lower = texto.toLocaleLowerCase("pt-BR");

  for (const marcador of PROXIMOS_MARCADORES) {
    const index = lower.indexOf(marcador);

    if (index !== -1 && index < corte) {
      corte = index;
    }
  }

  return texto.slice(0, corte).trim();
}

interface GatilhoEncontrado {
  readonly fim: number;
  readonly inicio: number;
  readonly intent: IntentAcao;
}

function acharGatilhos(clausula: string): GatilhoEncontrado[] {
  const lower = clausula.toLocaleLowerCase("pt-BR");
  const achados: GatilhoEncontrado[] = [];

  for (const [intent, entrada] of Object.entries(ONTOLOGIA) as [
    IntentAcao,
    (typeof ONTOLOGIA)[IntentAcao],
  ][]) {
    for (const gatilho of entrada.gatilhos) {
      const pattern = new RegExp(`\\b${gatilho}\\b`, "iu");
      const match = pattern.exec(lower);

      if (match) {
        achados.push({
          intent,
          inicio: match.index,
          fim: match.index + match[0].length,
        });
        break;
      }
    }
  }

  return achados.sort((left, right) => left.inicio - right.inicio);
}

function extrairAlvo(restante: string): string {
  let corte = restante.length;

  for (const marker of STOP_MARKERS) {
    const index = restante.toLocaleLowerCase("pt-BR").indexOf(marker);

    if (index !== -1 && index < corte) {
      corte = index;
    }
  }

  return restante.slice(0, corte).trim().replace(/\s+/gu, " ");
}

function coletarTodos(pattern: RegExp, texto: string): string[] {
  const resultado: string[] = [];
  const global = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`
  );
  let match = global.exec(texto);

  while (match) {
    const valor = match.slice(1).find((group) => group !== undefined);

    if (valor) {
      resultado.push(cortarNoProximoMarcador(valor));
    }

    match = global.exec(texto);
  }

  return resultado;
}

function extrairQualificadores(clausula: string): QualificadoresAcao {
  const escopo = MARCADOR_ESCOPO_PATTERN.exec(clausula);
  const metodo = MARCADOR_METODO_PATTERN.exec(clausula);
  const criterios = coletarTodos(MARCADOR_CRITERIO_PATTERN, clausula);
  const restricoes = coletarTodos(MARCADOR_RESTRICAO_PATTERN, clausula);
  const dependencia = MARCADOR_DEPENDENCIA_PATTERN.exec(clausula);

  const constraints = dependencia
    ? [...restricoes, `depende de ${cortarNoProximoMarcador(dependencia[1])}`]
    : restricoes;

  return {
    ...(escopo
      ? { scope: cortarNoProximoMarcador(escopo[1] ?? escopo[2]) }
      : {}),
    ...(metodo ? { method: cortarNoProximoMarcador(metodo[1]) } : {}),
    ...(criterios.length ? { criteria: criterios } : {}),
    ...(constraints.length ? { constraints } : {}),
  };
}

function extrairResultadoEsperado(clausula: string): string | undefined {
  const match = MARCADOR_RESULTADO_PATTERN.exec(clausula);
  return match ? cortarNoProximoMarcador(match[1]) : undefined;
}

const LINE_BREAK_PATTERN = /[\r\n]+/u;
const SENTENCE_BREAK_PATTERN = /(?<=[.!?;])\s+/u;
const TRAILING_PUNCTUATION_PATTERN = /[.!?;]+$/u;

function segmentarClausulas(textoLivre: string): string[] {
  return textoLivre
    .split(LINE_BREAK_PATTERN)
    .flatMap((linha) => linha.split(SENTENCE_BREAK_PATTERN))
    .map((clausula) =>
      clausula.trim().replace(TRAILING_PUNCTUATION_PATTERN, "").trim()
    )
    .filter(Boolean);
}

const CONECTIVO_OU_PATTERN = /\bou\b/iu;

function detectarProblemas(
  clausula: string,
  alvo: string,
  gatilhos: readonly GatilhoEncontrado[]
): string[] {
  const problemas: string[] = [];

  if (gatilhos.length > 1) {
    const entreGatilhos = clausula.slice(gatilhos[0].fim, gatilhos[1].inicio);

    if (CONECTIVO_OU_PATTERN.test(entreGatilhos)) {
      problemas.push("AMBIGUOUS_OPERATOR");
    }
  }

  if (!alvo || PRONOMES_AMBIGUOS.has(alvo.toLocaleLowerCase("pt-BR"))) {
    problemas.push("AMBIGUOUS_TARGET");
  }

  if (MARCADOR_OPCIONALIDADE_PATTERN.test(clausula)) {
    problemas.push("OPTIONALITY_UNRESOLVED");
  }

  if (
    MARCADOR_DEPENDENCIA_PATTERN.test(clausula) &&
    MARCADOR_PENDENCIA_PATTERN.test(clausula)
  ) {
    problemas.push("DEPENDENCY_MISSING");
  }

  if (MARCADOR_CRITERIO_AUSENTE_PATTERN.test(clausula)) {
    problemas.push("CRITERION_MISSING");
  }

  if (MARCADOR_RESULTADO_DESCONHECIDO_PATTERN.test(clausula)) {
    problemas.push("EXPECTED_RESULT_UNKNOWN");
  }

  if (MARCADOR_ESCOPO_AMBIGUO_PATTERN.test(clausula)) {
    problemas.push("SCOPE_AMBIGUOUS");
  }

  if (MARCADOR_FONTE_PATTERN.test(clausula)) {
    problemas.push("SOURCE_CONFLICT");
  }

  if (MARCADOR_SEQUENCIA_PATTERN.test(clausula)) {
    problemas.push("SEQUENCE_CONFLICT");
  }

  return problemas;
}

function calcularStatus(problemas: readonly string[]): UnidadeAcao["status"] {
  if (problemas.includes("DEPENDENCY_MISSING")) {
    return "BLOCKED";
  }

  return problemas.length ? "PARTIAL" : "READY";
}

const MENSAGENS_PROBLEMA: Readonly<Record<string, string>> = {
  AMBIGUOUS_OPERATOR:
    'dois operadores concorrentes na mesma oração ligados por "ou"',
  AMBIGUOUS_TARGET: "alvo não identificado com precisão na oração de origem",
  OPTIONALITY_UNRESOLVED:
    "oração contém decisão explicitamente marcada como não definida",
  DEPENDENCY_MISSING: "depende de algo ainda não confirmado ou aprovado",
  CRITERION_MISSING: "critério de sucesso mencionado mas não definido",
  EXPECTED_RESULT_UNKNOWN:
    "resultado esperado declarado como incerto ou não definido",
  SCOPE_AMBIGUOUS: "escopo mencionado como não definido ou indeciso",
  SOURCE_CONFLICT: "fontes ou dados de origem declarados como conflitantes",
  SEQUENCE_CONFLICT: "ordem/sequência de execução declarada como não definida",
};

/**
 * Decompõe texto livre em `UnidadeAcao[]`, seguindo o pipeline
 * ORAÇÃO → operador (ontologia) → alvo → qualificadores → status.
 * Determinístico: mesma entrada sempre produz a mesma saída.
 */
export function normalizarPlano(textoLivre: string): ResultadoNormalizacao {
  const clausulas = segmentarClausulas(textoLivre);
  const actions: UnidadeAcao[] = [];
  const issues: string[] = [];

  for (const clausula of clausulas) {
    const gatilhos = acharGatilhos(clausula);

    if (!gatilhos.length) {
      continue;
    }

    const principal = gatilhos[0];
    const intent = principal.intent;
    const operator = ONTOLOGIA[intent].verbo;
    const alvo = extrairAlvo(clausula.slice(principal.fim));
    const qualifiers = extrairQualificadores(clausula);
    const expectedResult = extrairResultadoEsperado(clausula);
    const problemas = detectarProblemas(clausula, alvo, gatilhos);
    const status = calcularStatus(problemas);

    const referenciaOrigem =
      clausula.length > 96 ? `${clausula.slice(0, 93)}...` : clausula;

    actions.push({
      intent,
      operator,
      target: alvo || "(alvo não identificado)",
      qualifiers,
      ...(expectedResult ? { expected_result: expectedResult } : {}),
      status,
      source_refs: [referenciaOrigem],
    });

    for (const codigo of problemas) {
      issues.push(
        `${codigo} (ação ${actions.length} — "${operator}"): ${MENSAGENS_PROBLEMA[codigo]}.`
      );
    }
  }

  if (!actions.length) {
    return {
      normalization_status: "NEEDS_RESOLUTION",
      actions: [],
      issues: [
        "NO_ACTION_IDENTIFIED: nenhuma oração do texto correspondeu a um verbo de operação reconhecido.",
      ],
    };
  }

  const normalizationStatus: ResultadoNormalizacao["normalization_status"] =
    actions.every((action) => action.status === "READY")
      ? "READY"
      : "NEEDS_RESOLUTION";

  return { normalization_status: normalizationStatus, actions, issues };
}

/**
 * Gera a frase canônica de uma ação, na ordem de precedência do modelo:
 * VERBO+OBJETO → +ESCOPO (se discriminativo) → +MÉTODO (se obrigatório) →
 * +CRITÉRIO (se define sucesso) → +RESTRIÇÃO (se limita execução) →
 * +RESULTADO (se não for redundante). Nunca infla uma ação mínima válida.
 */
export function renderizarFraseAcao(action: UnidadeAcao): string {
  let frase = `${action.operator} ${action.target}`.trim();

  if (action.qualifiers.scope) {
    frase += ` em ${action.qualifiers.scope}`;
  }

  if (action.qualifiers.method) {
    frase += ` usando ${action.qualifiers.method}`;
  }

  if (action.qualifiers.criteria?.length) {
    frase += ` até ${action.qualifiers.criteria.join("; ")}`;
  }

  if (action.qualifiers.constraints?.length) {
    frase += `, respeitando ${action.qualifiers.constraints.join("; ")}`;
  }

  if (
    action.expected_result &&
    !frase
      .toLocaleLowerCase("pt-BR")
      .includes(action.expected_result.toLocaleLowerCase("pt-BR"))
  ) {
    frase += ` para ${action.expected_result}`;
  }

  return `${frase}.`;
}

/**
 * Formata um `ResultadoNormalizacao` como texto de pendências, no padrão já
 * definido para o card Bad Path: "○" pronto / "△" pendente, mensagens
 * codificadas e rodapé "[ RESOLVER · N PENDÊNCIAS ]" em vez de "Iniciar".
 * Usado como mensagem de erro quando `normalization_status` é
 * `NEEDS_RESOLUTION`, para que a criação nunca complete silenciosamente.
 */
export function formatarPendencias(resultado: ResultadoNormalizacao): string {
  const linhas = resultado.actions.map((action, index) => {
    const marcador = action.status === "READY" ? "○" : "△";
    return `${marcador} ${index + 1}. ${renderizarFraseAcao(action)}`;
  });

  const pendentes = resultado.actions.filter(
    (action) => action.status !== "READY"
  ).length;
  const totalPendencias = pendentes || resultado.issues.length;

  return [
    "O plano não pôde ser normalizado automaticamente:",
    ...linhas,
    "",
    ...resultado.issues,
    "",
    `[ RESOLVER · ${totalPendencias} PENDÊNCIAS ]`,
  ].join("\n");
}
