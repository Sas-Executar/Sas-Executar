/**
 * Projeção pura do Mapa-OS impresso (Prisma/Tripé).
 *
 * Compõe apenas funções de leitura já existentes em `domain.ts` — nenhum
 * estado novo é introduzido. Segue o mesmo espírito de `projection.ts`
 * (`projetarEstado`): entrada é `EstadoOperacional`, saída é um payload
 * versionado, somente leitura, sem efeitos colaterais.
 *
 * As três zonas de conteúdo (`admin`, `ciclo`, `notas`) correspondem a
 * A1 · ADMIN/ATALHO, A2 · CICLO/ROTINA e A3 · NOTAS do contrato canônico
 * Mapa-OS — o mesmo conteúdo, qualquer que seja a geometria física
 * (Prisma A4 retrato ou Tripé A4 paisagem) escolhida pelo renderer.
 */

import {
  calendarioProjeto,
  type DiaOperacional,
  type Entrega,
  type EstadoOperacional,
  entregasAtivas,
  filaPronta,
  focoAtual,
  progresso,
  projetoAtivo,
} from "./domain.ts";

const DIAS_SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"] as const;
const OPERACOES_ADMIN = [
  { id: "entrada", label: "Entrada" },
  { id: "copiloto", label: "Copiloto" },
  { id: "seletor", label: "Seletor" },
  { id: "feito", label: "Feito" },
  { id: "saida", label: "Saída" },
] as const;
const DIAS_UTEIS_ROADMAP = 6;
const WORKFLOWS_POR_DIA = 3;
const LIMITE_PALAVRAS_ENTREGAVEL = 2;
const LIMITE_PALAVRAS_WORKFLOW = 5;
/** Dias de tolerância antes de assumir que uma data "DD/MM" já virou o ano seguinte. */
const JANELA_INFERENCIA_ANO_DIAS = 200;
const MS_POR_DIA = 86_400_000;
const ESPACOS_PATTERN = /\s+/;

export type EstadoRotina = "current" | "done" | "next" | "planned";
export type EstadoDiaSemana = "current" | "done" | "planned";
export type AcaoScannerId =
  | "copiloto"
  | "entrada"
  | "feito"
  | "saida"
  | "seletor";
export type NotasLaneId = "agora" | "depois" | "proximo";

export interface AcaoAdminProjetada {
  readonly id: AcaoScannerId;
  readonly label: string;
  readonly qrPayload: string;
}

export interface DiaSemanaProjetado {
  readonly date: string;
  readonly day: string;
  readonly state: EstadoDiaSemana;
}

export interface RotinaNoProjetado {
  readonly id: string;
  readonly label: string;
  readonly meta: string;
  readonly state: EstadoRotina;
  readonly status: string;
}

export interface WorkflowProjetado {
  readonly label: string;
  readonly placeholder: boolean;
  readonly steps: number;
}

export interface DayCardProjetado {
  readonly date: string;
  readonly day: string;
  readonly deliverable: string | null;
  readonly duration: string;
  readonly placeholder: boolean;
  readonly qrPayload: string;
  readonly workflows: readonly WorkflowProjetado[];
}

export interface NotasLaneProjetada {
  readonly id: NotasLaneId;
  readonly label: string;
}

export interface MapaOSProjecao {
  readonly admin: {
    readonly actions: readonly AcaoAdminProjetada[];
    readonly week: readonly DiaSemanaProjetado[];
  };
  readonly ciclo: {
    readonly dayCards: readonly DayCardProjetado[];
    readonly routine: readonly RotinaNoProjetado[];
  };
  readonly generatedAt: string;
  readonly notas: {
    readonly lanes: readonly NotasLaneProjetada[];
    readonly qrPayload: string;
  };
  readonly progress: {
    readonly completedCount: number;
    readonly percentage: number;
    readonly totalCount: number;
  };
  readonly project: { readonly id: string; readonly name: string };
  readonly schemaVersion: "1.0.0";
}

function limitarPalavras(text: string, max: number): string {
  const palavras = text.trim().split(ESPACOS_PATTERN).filter(Boolean);

  if (palavras.length <= max) {
    return palavras.join(" ");
  }

  return `${palavras.slice(0, max).join(" ")}…`;
}

/**
 * `Entrega.date` guarda só "DD/MM" (sem ano). Para exibir o dia da semana no
 * papel, inferimos o ano mais próximo da data de referência: se a data ainda
 * não passou há mais de `JANELA_INFERENCIA_ANO_DIAS` dias, usamos o ano
 * corrente; caso contrário, assumimos o próximo ano. É uma inferência
 * deliberada (o domínio não versiona ano por tarefa), documentada aqui em vez
 * de silenciosa.
 */
function inferirData(dateDDMM: string, referencia: Date): Date | null {
  const partes = dateDDMM.split("/").map(Number);

  if (partes.length !== 2 || partes.some((value) => Number.isNaN(value))) {
    return null;
  }

  const [dia, mes] = partes;
  const anoBase = referencia.getFullYear();
  const candidata = new Date(anoBase, mes - 1, dia);
  const diffDias = (candidata.getTime() - referencia.getTime()) / MS_POR_DIA;

  if (diffDias < -JANELA_INFERENCIA_ANO_DIAS) {
    return new Date(anoBase + 1, mes - 1, dia);
  }

  return candidata;
}

function abreviarDiaSemana(dateDDMM: string, referencia: Date): string {
  const data = inferirData(dateDDMM, referencia);
  return data ? DIAS_SEMANA[data.getDay()] : "—";
}

function calcularSteps(task: Entrega): number {
  return Math.max(1, Math.ceil(task.mins / 15));
}

function estadoDoDiaSemana(diffDias: number): EstadoDiaSemana {
  if (diffDias === 0) {
    return "current";
  }

  return diffDias < 0 ? "done" : "planned";
}

function projetarSemanaAdmin(referencia: Date): readonly DiaSemanaProjetado[] {
  const hoje = new Date(referencia);
  hoje.setHours(0, 0, 0, 0);

  const diaSemanaHoje = hoje.getDay(); // 0=domingo … 6=sábado
  const diffParaSegunda = diaSemanaHoje === 0 ? -6 : 1 - diaSemanaHoje;
  const segunda = new Date(hoje);
  segunda.setDate(segunda.getDate() + diffParaSegunda);

  return Array.from({ length: 7 }, (_, index) => {
    const data = new Date(segunda);
    data.setDate(segunda.getDate() + index);

    const diaMes = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const diffDias = Math.round((data.getTime() - hoje.getTime()) / MS_POR_DIA);

    return {
      date: `${diaMes}/${mes}`,
      day: DIAS_SEMANA[data.getDay()],
      state: estadoDoDiaSemana(diffDias),
    };
  });
}

function projetarAcoesAdmin(): readonly AcaoAdminProjetada[] {
  return OPERACOES_ADMIN.map((acao) => ({
    id: acao.id,
    label: acao.label,
    qrPayload: `executar://scan/${acao.id}`,
  }));
}

function projetarRotina(
  tasks: readonly Entrega[],
  state: EstadoOperacional
): readonly RotinaNoProjetado[] {
  const porId = new Map(tasks.map((task) => [task.id, task] as const));
  const nos: RotinaNoProjetado[] = [];

  const concluidasRecentes = state.done
    .slice(-2)
    .map((id) => porId.get(id))
    .filter((task): task is Entrega => Boolean(task));

  for (const task of concluidasRecentes) {
    nos.push({
      id: task.id,
      label: limitarPalavras(task.title, LIMITE_PALAVRAS_ENTREGAVEL),
      meta: task.date,
      status: "Concluído",
      state: "done",
    });
  }

  const foco = focoAtual(tasks, state);

  if (foco) {
    nos.push({
      id: foco.id,
      label: limitarPalavras(foco.title, LIMITE_PALAVRAS_ENTREGAVEL),
      meta: foco.date,
      status: "Em andamento",
      state: "current",
    });
  }

  const prontas = filaPronta(tasks, state).filter(
    (task) => task.id !== foco?.id
  );
  const restantes = Math.max(0, 6 - nos.length);

  prontas.slice(0, restantes).forEach((task, index) => {
    nos.push({
      id: task.id,
      label: limitarPalavras(task.title, LIMITE_PALAVRAS_ENTREGAVEL),
      meta: task.date,
      status: "Previsto",
      state: index === 0 ? "next" : "planned",
    });
  });

  return nos;
}

function workflowPlaceholder(): WorkflowProjetado {
  return { label: "— sem tarefa", steps: 0, placeholder: true };
}

function projetarWorkflows(
  tasks: readonly Entrega[]
): readonly WorkflowProjetado[] {
  const ordenadas = [...tasks].sort((left, right) => left.stage - right.stage);

  if (ordenadas.length <= WORKFLOWS_POR_DIA) {
    const workflows = ordenadas.map<WorkflowProjetado>((task) => ({
      label: limitarPalavras(task.title, LIMITE_PALAVRAS_WORKFLOW),
      steps: calcularSteps(task),
      placeholder: false,
    }));

    while (workflows.length < WORKFLOWS_POR_DIA) {
      workflows.push(workflowPlaceholder());
    }

    return workflows;
  }

  const visiveis = ordenadas
    .slice(0, WORKFLOWS_POR_DIA - 1)
    .map<WorkflowProjetado>((task) => ({
      label: limitarPalavras(task.title, LIMITE_PALAVRAS_WORKFLOW),
      steps: calcularSteps(task),
      placeholder: false,
    }));
  const extras = ordenadas.slice(WORKFLOWS_POR_DIA - 1);
  const stepsExtras = extras.reduce(
    (total, task) => total + calcularSteps(task),
    0
  );

  return [
    ...visiveis,
    {
      label: `+${extras.length} tarefas`,
      steps: stepsExtras,
      placeholder: false,
    },
  ];
}

function diaCardPlaceholder(): DayCardProjetado {
  return {
    date: "—",
    day: "—",
    deliverable: null,
    duration: "—",
    placeholder: true,
    qrPayload: "executar://roadmap",
    workflows: Array.from({ length: WORKFLOWS_POR_DIA }, workflowPlaceholder),
  };
}

function projetarDayCards(
  dias: readonly DiaOperacional[],
  referencia: Date
): readonly DayCardProjetado[] {
  const inicioDeHoje = new Date(referencia);
  inicioDeHoje.setHours(0, 0, 0, 0);

  const futuros = dias.filter((dia) => {
    const data = inferirData(dia.date, referencia);
    return data ? data.getTime() >= inicioDeHoje.getTime() : true;
  });
  const selecionados = (futuros.length ? futuros : [...dias]).slice(
    0,
    DIAS_UTEIS_ROADMAP
  );

  const cards = selecionados.map<DayCardProjetado>((dia) => {
    const principal = dia.tasks[0] ?? null;

    return {
      date: dia.date,
      day: abreviarDiaSemana(dia.date, referencia),
      deliverable: principal
        ? limitarPalavras(principal.title, LIMITE_PALAVRAS_ENTREGAVEL)
        : null,
      duration: `${dia.plannedMinutes} MIN`,
      placeholder: false,
      qrPayload: principal
        ? `executar://task/${principal.id}`
        : "executar://roadmap",
      workflows: projetarWorkflows(dia.tasks),
    };
  });

  while (cards.length < DIAS_UTEIS_ROADMAP) {
    cards.push(diaCardPlaceholder());
  }

  return cards;
}

const NOTAS_LANES: readonly NotasLaneProjetada[] = [
  { id: "agora", label: "AGORA" },
  { id: "proximo", label: "PRÓXIMO" },
  { id: "depois", label: "DEPOIS" },
];

export function projetarMapaOS(
  state: EstadoOperacional,
  generatedAt: string,
  referencia: Date = new Date(generatedAt)
): MapaOSProjecao {
  const project = projetoAtivo(state);
  const tasks = entregasAtivas(state);
  const dias = calendarioProjeto(state);
  const snapshot = progresso(tasks, state);

  return {
    schemaVersion: "1.0.0",
    generatedAt,
    project: { id: project.id, name: project.name },
    admin: {
      week: projetarSemanaAdmin(referencia),
      actions: projetarAcoesAdmin(),
    },
    ciclo: {
      routine: projetarRotina(tasks, state),
      dayCards: projetarDayCards(dias, referencia),
    },
    notas: {
      lanes: NOTAS_LANES,
      qrPayload: "executar://documents",
    },
    progress: {
      completedCount: state.done.length,
      totalCount: tasks.length,
      percentage: snapshot.percentage,
    },
  };
}
