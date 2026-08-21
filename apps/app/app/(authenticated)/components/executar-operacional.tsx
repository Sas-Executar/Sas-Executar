"use client";

import { OrganizationSwitcher, UserButton } from "@repo/auth/client";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  adicionarEntrega,
  assumirFoco,
  atualizarCapacidadeProjeto,
  calendarioProjeto,
  caminhoCritico,
  chaveOrganizacao,
  ciclosProjeto,
  concluirEntrega,
  criarProjeto,
  dependenciasPendentes,
  editarEntrega,
  entregasAtivas,
  estadoEntrega,
  executarAcaoCopiloto,
  exportarPlano,
  filaBloqueada,
  filaPronta,
  focoAtual,
  importarPlano,
  novoEstado,
  progresso,
  projetoAtivo,
  registrarEvidencia,
  registrarPasso,
  removerEntrega,
  renomearProjeto,
  resolverAprovacaoCopiloto,
  restaurarEstado,
  ROTULOS_ESTADO,
  selecionarProjeto,
  type AprovacaoCopiloto,
  type ArquivoEvidencia,
  type Entrega,
  type EstadoOperacional,
} from "@/lib/executar/domain";
import { ENTREGAS_SPRINT } from "@/lib/executar/seed";
import "../executar.css";

type View = "overview" | "focus" | "calendar" | "path";

interface ExecutarOperacionalProperties {
  readonly organizationId: string;
}

interface MensagemCopiloto {
  readonly author: "pessoa" | "copiloto";
  readonly text: string;
}

const VIEWS: ReadonlyArray<{ id: View; label: string; icon: string }> = [
  { id: "overview", label: "Visão geral", icon: "▦" },
  { id: "focus", label: "Foco", icon: "▶" },
  { id: "calendar", label: "Calendário", icon: "□" },
  { id: "path", label: "Caminho", icon: "↗" },
];

const DIAS = [
  ["seg", "24/08", "Fechar a base"],
  ["ter", "25/08", "Fechar conta e oferta"],
  ["qua", "26/08", "Preparar o conteúdo"],
  ["qui", "27/08", "Conectar o produto"],
  ["sex", "28/08", "Colocar no ar"],
  ["seg", "31/08", "Fechar provas"],
  ["ter", "01/09", "Fechar ofertas"],
  ["qua", "02/09", "Medir e lançar"],
  ["qui", "03/09", "Publicar e testar"],
  ["sex", "04/09", "Fechar e comprovar"],
] as const;

const ROTAS = [
  "Aplicativo",
  "Blog",
  "Mostruário",
  "Consultoria",
  "Produtos físicos",
  "Infoprodutos",
  "Negócio",
  "Dados",
] as const;

function formatarMinutos(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return hours
    ? `${hours}h${remainder ? String(remainder).padStart(2, "0") : ""}`
    : `${minutes} min`;
}

function lerArquivoEvidencia(file: File): Promise<ArquivoEvidencia> {
  if (file.size > 2_500_000) {
    return Promise.reject(
      new Error("O arquivo da evidência deve ter no máximo 2,5 MB.")
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Não foi possível ler o arquivo da evidência."));
        return;
      }

      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result,
      });
    };
    reader.onerror = () =>
      reject(new Error("Não foi possível ler o arquivo da evidência."));
    reader.readAsDataURL(file);
  });
}

function Overview({
  state,
  tasks,
  focus,
  changeView,
}: {
  readonly state: EstadoOperacional;
  readonly tasks: readonly Entrega[];
  readonly focus: Entrega | null;
  readonly changeView: (view: View) => void;
}) {
  const current = progresso(tasks, state);
  const calendar = calendarioProjeto(state);
  const protection = Math.max(
    0,
    calendar.length * projetoAtivo(state).dailyCapacityMinutes - current.total
  );
  const critical = caminhoCritico(tasks);
  const fronts = ["Desenvolvimento", "Criativo", "Operações"];

  return (
    <>
      <div className="kpis">
        {[
          ["Planejado", formatarMinutos(current.total), "para fechar a fase"],
          ["Proteção", formatarMinutos(protection), "sem ampliar escopo"],
          [
            "Não pode atrasar",
            formatarMinutos(critical.minutes),
            "caminho principal",
          ],
          [
            "Concluído",
            `${current.percentage}%`,
            `${state.done.length} de ${tasks.length} entregas`,
          ],
          ["Evidências", String(state.evidence.length), "registros salvos"],
        ].map(([label, value, detail]) => (
          <div className="card kpi" key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <em>{detail}</em>
          </div>
        ))}
      </div>
      <div className="two">
        <div className="card">
          <div className="cardHead">
            <h2>Plano no tempo</h2>
            <span>24 ago → 04 set</span>
          </div>
          <div className="cardBody">
            <div className="ganttHead">
              <div />
              {DIAS.map(([, date]) => (
                <div key={date}>{date.slice(0, 2)}</div>
              ))}
            </div>
            {[
              ["Base do aplicativo", 0, 20],
              ["Conta e acesso", 10, 26],
              ["Produto funcionando", 20, 48],
              ["Provas reais", 50, 25],
              ["Campanhas", 70, 16],
              ["Publicar e comprovar", 80, 18],
            ].map(([label, left, width], index) => (
              <div className="ganttRow" key={label}>
                <label>{label}</label>
                <div className="track">
                  <span
                    className={`bar ${index < 3 ? "current" : "later"}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="cardHead">
            <h2>8 rotas do resultado</h2>
            <span>uma única visão</span>
          </div>
          <div className="cardBody ringWrap">
            <div aria-label="Oito rotas de entrega" className="routeRing" />
            <div className="routeLegend">
              {ROTAS.map((route) => (
                <span key={route}>{route}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="three executarResumo">
        <button
          className="card actionCard executarAcao"
          onClick={() => changeView("focus")}
          type="button"
        >
          <div className="actionTop">
            <div>
              <div className="actionTitle">Faça agora</div>
              <small>{focus?.title ?? "Fase concluída"}</small>
            </div>
            <span className="badge blue">{focus?.mins ?? 0} min</span>
          </div>
          <div className="progress executarProgresso">
            <span style={{ width: `${current.percentage}%` }} />
          </div>
        </button>
        <div className="card">
          <div className="cardHead">
            <h2>Tempo por frente</h2>
            <span>{formatarMinutos(current.total)}</span>
          </div>
          <div className="cardBody">
            {fronts.map((front) => {
              const minutes = tasks.filter(
                (task) => task.front === front
              ).reduce((total, task) => total + task.mins, 0);

              return (
                <div className="executarFrente" key={front}>
                  <div>
                    <b>{front}</b>
                    <span>{formatarMinutos(minutes)}</span>
                  </div>
                  <div className="progress">
                    <span
                      style={{
                        width: `${current.total ? Math.round((minutes / current.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="cardHead">
            <h2>Marcos</h2>
            <span>3 ciclos + fechamento</span>
          </div>
          <div className="cardBody milestones">
            {["26/08", "31/08", "03/09", "04/09"].map((date, index) => (
              <div className={`ms ${index === 0 ? "now" : ""}`} key={date}>
                <i>{index === 0 ? "●" : ""}</i>
                <b>{date}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Focus({
  state,
  tasks,
  focus,
  setState,
  openEvidence,
}: {
  readonly state: EstadoOperacional;
  readonly tasks: readonly Entrega[];
  readonly focus: Entrega | null;
  readonly setState: (state: EstadoOperacional) => void;
  readonly openEvidence: () => void;
}) {
  if (!focus) {
    return (
      <div className="card cardBody">
        <h2>Fase concluída</h2>
        <p>Todas as entregas liberadas foram fechadas.</p>
      </div>
    );
  }

  const ready = filaPronta(tasks, state).filter(
    (task) => task.id !== focus.id
  );
  const blocked = filaBloqueada(tasks, state);
  const steps = Math.max(1, Math.ceil(focus.mins / 15));
  const completedSteps = state.started[focus.id] ?? 0;
  const evidence = state.evidence.filter((proof) => proof.taskId === focus.id);

  return (
    <div className="focusGrid">
      <div className="focusStage">
        <div className="flashShell">
          <div className="flashCard">
            <div className="flashVisual">
              <div className="bigIcon">✓</div>
              <div className="counter">{focus.stage}/4</div>
            </div>
            <div className="flashText">
              <div className="eyebrow">{focus.front.toLocaleUpperCase("pt-BR")}</div>
              <h2>{focus.title}</h2>
              <p>
                {focus.deps.length
                  ? "Tudo que precisava vir antes já está fechado. Faça somente esta entrega e registre a comprovação."
                  : "Este item já pode começar. Faça, feche e registre a comprovação."}
              </p>
              <div className="flashMeta">
                <span className="chip">{focus.mins} min</span>
                <span className="chip">{steps} passos de 15 min</span>
                <span className="chip">{evidence.length} evidência(s)</span>
              </div>
            </div>
            <button className="doneBtn" onClick={openEvidence} type="button">
              Feito
            </button>
          </div>
        </div>
        <div className="queueLabel">Fila · toque em um cartão para assumir o foco</div>
        <div className="queueTiles">
          {Array.from({ length: 4 }, (_, index) => {
            const task = ready[index];

            return (
              <button
                aria-label={task?.title ?? "Sem entrega liberada"}
                className="qTile"
                disabled={!task}
                key={task?.id ?? `empty-${index}`}
                onClick={() =>
                  task && setState(assumirFoco(tasks, state, task.id))
                }
                type="button"
              >
                <span>{task ? `${index + 1}/4` : "—"}</span>
                {task && <b className="executarQueueId">{task.id}</b>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="focusSide">
        <div className="card">
          <div className="cardHead">
            <h2>Passos</h2>
            <span>{completedSteps}/{steps}</span>
          </div>
          <div className="cardBody">
            <div className="steps">
              {Array.from({ length: Math.min(24, steps) }, (_, index) => (
                <span
                  aria-label={`Passo ${index + 1}`}
                  className={`step ${index < completedSteps ? "on" : ""}`}
                  key={`step-${focus.id}-${index}`}
                />
              ))}
            </div>
            <button
              className="softBtn executarBotaoLargo"
              onClick={() =>
                setState(registrarPasso(tasks, state, focus.id))
              }
              type="button"
            >
              Marcar próximo passo
            </button>
          </div>
        </div>
        <TaskList label="Pode fazer depois" tasks={ready.slice(0, 6)} />
        <TaskList blocked label="Ainda não pode" state={state} tasks={blocked.slice(0, 4)} total={blocked.length} />
        <div className="card">
          <div className="cardHead">
            <h2>Estado operacional</h2>
            <span>{ROTULOS_ESTADO[estadoEntrega(focus, { ...state, focus: focus.id })]}</span>
          </div>
          <div className="cardBody">
            <small>Uma entrega em foco. Evidência e verificação exigidas para concluir.</small>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskList({
  label,
  tasks,
  state,
  blocked = false,
  total,
}: {
  readonly label: string;
  readonly tasks: readonly Entrega[];
  readonly state?: EstadoOperacional;
  readonly blocked?: boolean;
  readonly total?: number;
}) {
  return (
    <div className="card">
      <div className="cardHead">
        <h2>{label}</h2>
        <span>{total ?? tasks.length}</span>
      </div>
      <div className={`cardBody ${blocked ? "lockedList" : "readyList"}`}>
        {tasks.length ? (
          tasks.map((task) => (
            <div className="miniTask" key={task.id}>
              <div>
                <b>{task.title}</b>
                <small>
                  {blocked && state
                    ? `espera ${dependenciasPendentes(task, state).join(", ")}`
                    : task.front}
                </small>
              </div>
              <span className={blocked ? undefined : "badge"}>
                {blocked ? "⌛" : `${task.mins}m`}
              </span>
            </div>
          ))
        ) : (
          <small>Nenhuma entrega nesta fila.</small>
        )}
      </div>
    </div>
  );
}

function Calendar({ state }: { readonly state: EstadoOperacional }) {
  const days = calendarioProjeto(state);
  const cycles = ciclosProjeto(state);

  return (
    <>
      <div className="card">
        <div className="cardHead">
          <h2>Resultados por dia</h2>
          <span>{days.length} dias operacionais</span>
        </div>
        <div className="cardBody calendarGrid">
          {days.map((day, index) => {
            const original = DIAS.find(([, date]) => date === day.date);
            const weekday = original?.[0] ?? "dia";
            const result = original?.[2] ?? "Fechar entregas do projeto";

            return (
              <div className={`dayCard ${index === 0 ? "now" : ""}`} key={day.date}>
                <div className="dow">{weekday}</div>
                <div className="num">{day.date.slice(0, 2)}</div>
                <h3>{result}</h3>
                <p>
                  {day.tasks.length} entregas programadas.
                  {day.overloaded && " Capacidade excedida."}
                </p>
                <footer>
                  <span>{formatarMinutos(day.plannedMinutes)}</span>
                  <span>{day.completedCount} feitas</span>
                </footer>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card executarResumo">
        <div className="cardHead">
          <h2>Ciclos de 72 horas</h2>
          <span>resultado por bloco</span>
        </div>
        <div className="cardBody cycleLine">
          {cycles.map((cycle, index) => (
            <div className={`cycle ${index === 0 ? "now" : ""}`} key={cycle.number}>
              <i>{index === 0 ? "●" : ""}</i>
              <b>Ciclo {cycle.number}</b>
              <small>
                {cycle.dates[0]}
                {cycle.dates.length > 1
                  ? `–${cycle.dates[cycle.dates.length - 1]}`
                  : ""}
              </small>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Path({
  state,
  tasks,
}: {
  readonly state: EstadoOperacional;
  readonly tasks: readonly Entrega[];
}) {
  const critical = new Set(caminhoCritico(tasks).taskIds);

  return (
    <div className="card pathCard">
      <div className="cardHead">
        <h2>O que libera o quê</h2>
        <span>azul = caminho crítico; cinza = dependência pendente</span>
      </div>
      <div className="cardBody executarPath">
        {[1, 2, 3, 4].map((stage) => (
          <section className="executarPathColumn" key={stage}>
            <h3>Etapa {stage}</h3>
            {tasks.filter((task) => task.stage === stage).map((task) => {
              const status = estadoEntrega(task, state);
              const waiting = dependenciasPendentes(task, state);

              return (
                <article
                  className={`executarPathNode ${critical.has(task.id) ? "hot" : ""}`}
                  key={task.id}
                >
                  <b>{task.id} · {task.title}</b>
                  <small>{ROTULOS_ESTADO[status]}</small>
                  {!!waiting.length && <small>Aguarda {waiting.join(", ")}</small>}
                  {!waiting.length && !!task.deps.length && (
                    <small>Liberado por {task.deps.join(", ")}</small>
                  )}
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}

function ProjectManager({
  state,
  setState,
  onClose,
}: {
  readonly state: EstadoOperacional;
  readonly setState: (state: EstadoOperacional) => void;
  readonly onClose: () => void;
}) {
  const project = projetoAtivo(state);
  const tasks = entregasAtivas(state);
  const [projectName, setProjectName] = useState(project.name);
  const [newProjectName, setNewProjectName] = useState("");
  const [dailyCapacity, setDailyCapacity] = useState(
    String(project.dailyCapacityMinutes)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskFront, setTaskFront] = useState("Operações");
  const [taskDate, setTaskDate] = useState(
    new Date().toLocaleDateString("pt-BR").slice(0, 5)
  );
  const [taskMinutes, setTaskMinutes] = useState("30");
  const [taskDependencies, setTaskDependencies] = useState("");
  const [taskStage, setTaskStage] = useState("1");
  const [taskDod, setTaskDod] = useState("");
  const [importContent, setImportContent] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");

  function execute(action: () => EstadoOperacional, success: string) {
    try {
      setState(action());
      setProblem("");
      setNotice(success);
    } catch (error) {
      setNotice("");
      setProblem(
        error instanceof Error ? error.message : "Não foi possível atualizar o projeto."
      );
    }
  }

  function createProject() {
    try {
      const created = criarProjeto(state, newProjectName);
      const next = created.projects[created.projects.length - 1];
      setState(selecionarProjeto(created, next.id));
      setProjectName(next.name);
      setDailyCapacity(String(next.dailyCapacityMinutes));
      setNewProjectName("");
      setProblem("");
      setNotice("Projeto criado e selecionado.");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Não foi possível criar.");
    }
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const task: Entrega = {
      id: taskId.trim(),
      title: taskTitle.trim(),
      front: taskFront.trim(),
      date: taskDate.trim(),
      mins: Number(taskMinutes),
      deps: taskDependencies
        .split(/[,;]+/)
        .map((dependency) => dependency.trim())
        .filter(Boolean),
      stage: Number(taskStage),
      ...(taskDod.trim() ? { dod: taskDod.trim() } : {}),
    };

    execute(
      () =>
        editingId
          ? editarEntrega(state, editingId, {
              title: task.title,
              front: task.front,
              date: task.date,
              mins: task.mins,
              deps: task.deps,
              stage: task.stage,
              ...(task.dod ? { dod: task.dod } : {}),
            })
          : adicionarEntrega(state, task),
      editingId ? "Entrega atualizada." : "Entrega criada."
    );
  }

  function editTask(task: Entrega) {
    setEditingId(task.id);
    setTaskId(task.id);
    setTaskTitle(task.title);
    setTaskFront(task.front);
    setTaskDate(task.date);
    setTaskMinutes(String(task.mins));
    setTaskDependencies(task.deps.join(", "));
    setTaskStage(String(task.stage));
    setTaskDod(task.dod ?? "");
  }

  function clearTask() {
    setEditingId(null);
    setTaskId("");
    setTaskTitle("");
    setTaskFront("Operações");
    setTaskDependencies("");
    setTaskMinutes("30");
    setTaskStage("1");
    setTaskDod("");
  }

  function downloadPlan() {
    const content = exportarPlano(state);
    const file = new Blob([content], { type: "application/json" });
    const address = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = address;
    link.download = `${project.id}.executar.json`;
    link.click();
    URL.revokeObjectURL(address);
    setNotice("Plano exportado com entregas, progresso e evidências.");
  }

  return (
    <div className="executarEvidenceBackdrop">
      <div
        aria-labelledby="executar-projeto-titulo"
        aria-modal="true"
        className="executarProjectDialog"
        role="dialog"
      >
        <div className="dialogHead executarProjectHead">
          <div>
            <small>PLANO OPERACIONAL</small>
            <h3 id="executar-projeto-titulo">Projetos e entregas</h3>
          </div>
          <button
            aria-label="Fechar gestão de projetos"
            className="iconBtn"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <section className="executarProjectSection">
          <label htmlFor="executar-projeto-ativo">Projeto ativo</label>
          <select
            id="executar-projeto-ativo"
            onChange={(event) => {
              const next = state.projects.find(
                (candidate) => candidate.id === event.target.value
              );

              if (next) {
                setState(selecionarProjeto(state, next.id));
                setProjectName(next.name);
                setDailyCapacity(String(next.dailyCapacityMinutes));
                clearTask();
              }
            }}
            value={state.activeProjectId}
          >
            {state.projects.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
          <div className="executarFieldRow">
            <input
              aria-label="Nome do projeto ativo"
              onChange={(event) => setProjectName(event.target.value)}
              value={projectName}
            />
            <button
              className="softBtn"
              onClick={() =>
                execute(
                  () => renomearProjeto(state, projectName),
                  "Projeto renomeado."
                )
              }
              type="button"
            >
              Renomear
            </button>
          </div>
          <div className="executarFieldRow">
            <input
              aria-label="Nome do novo projeto"
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="Nome de um novo projeto"
              value={newProjectName}
            />
            <button className="primaryBtn" onClick={createProject} type="button">
              Criar projeto
            </button>
          </div>
          <div className="executarFieldRow">
            <input
              aria-label="Capacidade diária em minutos"
              max="1440"
              min="15"
              onChange={(event) => setDailyCapacity(event.target.value)}
              type="number"
              value={dailyCapacity}
            />
            <button
              className="softBtn"
              onClick={() =>
                execute(
                  () =>
                    atualizarCapacidadeProjeto(state, Number(dailyCapacity)),
                  "Capacidade diária atualizada."
                )
              }
              type="button"
            >
              Ajustar capacidade
            </button>
          </div>
        </section>

        <section className="executarProjectSection">
          <h4>{editingId ? "Editar entrega" : "Nova entrega"}</h4>
          <form className="executarTaskForm" onSubmit={saveTask}>
            <input
              aria-label="Código da entrega"
              disabled={Boolean(editingId)}
              onChange={(event) => setTaskId(event.target.value)}
              placeholder="Código, ex.: APP-01"
              required
              value={taskId}
            />
            <input
              aria-label="Título da entrega"
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="O que precisa ser entregue?"
              required
              value={taskTitle}
            />
            <input
              aria-label="Frente operacional"
              onChange={(event) => setTaskFront(event.target.value)}
              placeholder="Frente operacional"
              required
              value={taskFront}
            />
            <input
              aria-label="Data no formato DD/MM"
              onChange={(event) => setTaskDate(event.target.value)}
              placeholder="DD/MM"
              required
              value={taskDate}
            />
            <input
              aria-label="Esforço em minutos"
              min="1"
              onChange={(event) => setTaskMinutes(event.target.value)}
              required
              type="number"
              value={taskMinutes}
            />
            <select
              aria-label="Etapa da entrega"
              onChange={(event) => setTaskStage(event.target.value)}
              value={taskStage}
            >
              {[1, 2, 3, 4].map((stage) => (
                <option key={stage} value={stage}>
                  Etapa {stage}
                </option>
              ))}
            </select>
            <input
              aria-label="Dependências separadas por vírgula"
              className="executarTaskWide"
              onChange={(event) => setTaskDependencies(event.target.value)}
              placeholder="Dependências: APP-01, APP-02"
              value={taskDependencies}
            />
            <input
              aria-label="Critério de conclusão da entrega"
              className="executarTaskWide"
              onChange={(event) => setTaskDod(event.target.value)}
              placeholder="Conclui quando... (critério de aceitação)"
              value={taskDod}
            />
            <div className="executarTaskWide executarFieldRow">
              <button className="primaryBtn" type="submit">
                {editingId ? "Salvar alterações" : "Adicionar entrega"}
              </button>
              {editingId && (
                <button className="softBtn" onClick={clearTask} type="button">
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="executarProjectSection">
          <div className="executarSectionHead">
            <h4>Entregas do projeto</h4>
            <span>{tasks.length}</span>
          </div>
          <div className="executarTaskList">
            {tasks.map((task) => (
              <div className="executarTaskRow" key={task.id}>
                <div>
                  <b>{task.id} · {task.title}</b>
                  <small>
                    {task.date} · {task.mins} min ·
                    {" "}{ROTULOS_ESTADO[estadoEntrega(task, state)]}
                  </small>
                </div>
                <button
                  className="softBtn"
                  onClick={() => editTask(task)}
                  type="button"
                >
                  Editar
                </button>
                <button
                  aria-label={`Remover ${task.id}`}
                  className="iconBtn"
                  onClick={() => {
                    if (window.confirm(`Remover a entrega ${task.id}?`)) {
                      execute(
                        () => removerEntrega(state, task.id),
                        "Entrega removida."
                      );
                    }
                  }}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
            {!tasks.length && <small>Nenhuma entrega. Adicione ou importe um plano.</small>}
          </div>
        </section>

        <section className="executarProjectSection">
          <h4>Importar ou exportar plano</h4>
          <input
            accept=".json,.csv,.md,.txt"
            aria-label="Selecionar arquivo de plano"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void file.text().then(setImportContent).catch(() => {
                  setProblem("Não foi possível ler o arquivo selecionado.");
                });
              }
            }}
            type="file"
          />
          <textarea
            aria-label="Conteúdo do plano para importação"
            onChange={(event) => setImportContent(event.target.value)}
            placeholder="Cole um plano em JSON, CSV ou Markdown."
            rows={4}
            value={importContent}
          />
          <div className="executarFieldRow">
            <select
              aria-label="Modo de importação"
              onChange={(event) =>
                setImportMode(event.target.value as "append" | "replace")
              }
              value={importMode}
            >
              <option value="append">Adicionar ao plano</option>
              <option value="replace">Substituir plano sem evidências</option>
            </select>
            <button
              className="primaryBtn"
              onClick={() =>
                execute(
                  () => importarPlano(state, importContent, importMode),
                  "Plano importado; filas e dependências recalculadas."
                )
              }
              type="button"
            >
              Importar
            </button>
            <button className="softBtn" onClick={downloadPlan} type="button">
              Exportar
            </button>
          </div>
        </section>

        <section className="executarProjectSection">
          <h4>Evidências registradas</h4>
          <div className="executarHistory">
            {state.evidence.map((proof) => (
              <div
                className="executarEvidenceItem"
                key={`${proof.taskId}-${proof.createdAt}`}
              >
                <b>{proof.taskId}</b>
                {proof.note && <small>{proof.note}</small>}
                {proof.url && (
                  <a href={proof.url} rel="noreferrer" target="_blank">
                    Abrir ligação
                  </a>
                )}
                {proof.file && (
                  <a download={proof.file.name} href={proof.file.data}>
                    Baixar {proof.file.name}
                  </a>
                )}
              </div>
            ))}
            {!state.evidence.length && (
              <small>Nenhuma evidência registrada neste projeto.</small>
            )}
          </div>
        </section>

        <section className="executarProjectSection">
          <h4>Histórico deste projeto</h4>
          <div className="executarHistory">
            {state.events
              .filter((entry) => entry.projectId === state.activeProjectId)
              .slice(-6)
              .reverse()
              .map((entry) => (
                <small key={`${entry.projectId}-${entry.revision}`}>
                  {entry.action}
                  {entry.taskId ? ` · ${entry.taskId}` : ""}
                </small>
              ))}
          </div>
        </section>

        {notice && <p className="executarNotice" role="status">{notice}</p>}
        {problem && <p className="executarErro" role="alert">{problem}</p>}
      </div>
    </div>
  );
}


export function ExecutarOperacional({
  organizationId,
}: ExecutarOperacionalProperties) {
  const [state, setState] = useState(() =>
    novoEstado(organizationId, ENTREGAS_SPRINT)
  );
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>("overview");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [pendingApproval, setPendingApproval] =
    useState<AprovacaoCopiloto | null>(null);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MensagemCopiloto[]>([
    {
      author: "copiloto",
      text: "Posso orientar a execução real. Pergunte “o que faço agora?” ou use /estado.",
    },
  ]);

  useEffect(() => {
    const stored = window.localStorage.getItem(chaveOrganizacao(organizationId));
    setState(restaurarEstado(stored, organizationId, ENTREGAS_SPRINT));
    setLoaded(true);
  }, [organizationId]);

  useEffect(() => {
    if (loaded && state.organizationId === organizationId) {
      window.localStorage.setItem(
        chaveOrganizacao(organizationId),
        JSON.stringify(state)
      );
    }
  }, [loaded, organizationId, state]);

  const tasks = useMemo(() => entregasAtivas(state), [state]);
  const focus = useMemo(() => focoAtual(tasks, state), [state, tasks]);
  const activeProject = projetoAtivo(state);
  const title = VIEWS.find((item) => item.id === view)?.label ?? "Visão geral";

  async function saveEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!focus) {
      return;
    }

    try {
      const file = evidenceFile
        ? await lerArquivoEvidencia(evidenceFile)
        : undefined;
      const withEvidence = registrarEvidencia(
        tasks,
        state,
        focus.id,
        note,
        url,
        verified,
        file
      );

      setState(concluirEntrega(tasks, withEvidence, focus.id));
      setEvidenceOpen(false);
      setNote("");
      setUrl("");
      setEvidenceFile(null);
      setVerified(false);
      setError("");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Não foi possível concluir.");
    }
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    const question = message.trim();

    try {
      const answer = executarAcaoCopiloto(state, question);

      if (answer.state !== state) {
        setState(answer.state);
      }

      setPendingApproval(answer.approval);
      setMessages((previous) => [
        ...previous,
        { author: "pessoa", text: question },
        { author: "copiloto", text: answer.reply },
      ]);
    } catch (problem) {
      setMessages((previous) => [
        ...previous,
        { author: "pessoa", text: question },
        {
          author: "copiloto",
          text:
            problem instanceof Error
              ? problem.message
              : "Não foi possível executar a ação solicitada.",
        },
      ]);
    }

    setMessage("");
  }

  function decideApproval(approved: boolean) {
    if (!pendingApproval) {
      return;
    }

    try {
      const result = resolverAprovacaoCopiloto(
        state,
        pendingApproval,
        approved
      );
      setState(result.state);
      setMessages((previous) => [
        ...previous,
        { author: "copiloto", text: result.reply },
      ]);
    } catch (problem) {
      setMessages((previous) => [
        ...previous,
        {
          author: "copiloto",
          text:
            problem instanceof Error
              ? problem.message
              : "Não foi possível aplicar a aprovação.",
        },
      ]);
    }

    setPendingApproval(null);
  }

  return (
    <>
      <div id="app">
        <aside className="side">
          <div className="brand">
            <div className="brandMark">E</div>
            <span>Executar</span>
          </div>
          <nav aria-label="Navegação principal">
            {VIEWS.map((item) => (
              <button
                aria-current={view === item.id ? "page" : undefined}
                className={`navItem ${view === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => setView(item.id)}
                type="button"
              >
                <span>{item.icon}</span>
                <b>{item.label}</b>
              </button>
            ))}
          </nav>
          <div className="executarProjectSwitch">
            <label htmlFor="executar-sidebar-projeto">Projeto</label>
            <select
              id="executar-sidebar-projeto"
              onChange={(event) =>
                setState(selecionarProjeto(state, event.target.value))
              }
              value={state.activeProjectId}
            >
              {state.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              className="softBtn"
              onClick={() => setProjectManagerOpen(true)}
              type="button"
            >
              Gerenciar plano
            </button>
          </div>
          <div className="sideFoot">
            <OrganizationSwitcher />
            <div className="executarConta">
              <UserButton />
              <small>Organização isolada neste dispositivo.</small>
            </div>
          </div>
        </aside>
        <main className="main">
          <header className="top">
            <div>
              <div className="eyebrow">
                PRÓXIMO 1 POR VEZ · {activeProject.name}
              </div>
              <h1>{view === "path" ? "Caminho do resultado" : title}</h1>
            </div>
            <div className="topActions">
              <span className="dateChip">24 ago — 04 set</span>
              <button
                className="softBtn executarMobileProject"
                onClick={() => setProjectManagerOpen(true)}
                type="button"
              >
                Projetos
              </button>
              <button
                aria-expanded={copilotOpen}
                className="softBtn"
                onClick={() => setCopilotOpen((open) => !open)}
                type="button"
              >
                Copiloto
              </button>
            </div>
          </header>
          {view === "overview" && (
            <Overview changeView={setView} focus={focus} state={state} tasks={tasks} />
          )}
          {view === "focus" && (
            <Focus
              focus={focus}
              openEvidence={() => setEvidenceOpen(true)}
              setState={setState}
              state={state}
              tasks={tasks}
            />
          )}
          {view === "calendar" && <Calendar state={state} />}
          {view === "path" && <Path state={state} tasks={tasks} />}
        </main>
        <nav aria-label="Navegação móvel" className="bottomNav">
          {VIEWS.map((item) => (
            <button
              className={view === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              <span>{item.icon}</span>
              <small>{item.id === "overview" ? "Visão" : item.label}</small>
            </button>
          ))}
        </nav>
      </div>
      {projectManagerOpen && (
        <ProjectManager
          onClose={() => setProjectManagerOpen(false)}
          setState={setState}
          state={state}
        />
      )}
      {copilotOpen && (
        <aside aria-label="Copiloto operacional" className="executarCopiloto">
          <div className="executarCopilotoHead">
            <div>
              <b>Copiloto EXECUTAR</b>
              <small>Mesmo plano · mesma organização</small>
            </div>
            <button
              aria-label="Fechar Copiloto"
              className="iconBtn"
              onClick={() => setCopilotOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>
          <div aria-live="polite" className="executarMensagens">
            {messages.map((entry, index) => (
              <div
                className={`executarMensagem ${entry.author}`}
                key={`${entry.author}-${index}`}
              >
                {entry.text}
              </div>
            ))}
            {pendingApproval && (
              <div className="executarAprovacao">
                <strong>Aprovação humana necessária</strong>
                <p>{pendingApproval.summary}</p>
                <div className="executarFieldRow">
                  <button
                    className="primaryBtn"
                    onClick={() => decideApproval(true)}
                    type="button"
                  >
                    Aprovar ação
                  </button>
                  <button
                    className="softBtn"
                    onClick={() => decideApproval(false)}
                    type="button"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            )}
          </div>
          <details className="executarAjudaCopiloto">
            <summary>Comandos para operar o plano</summary>
            <small>/projeto criar Nome</small>
            <small>/foco ID · /progresso · /concluir ID</small>
            <small>/evidencia verificar descrição</small>
            <small>/entrega atualizar ID data=DD/MM</small>
            <small>/replanejamento ID data=DD/MM</small>
          </details>
          <div className="executarComandos">
            {["/agora", "/progresso", "/concluir"].map((command) => (
              <button
                className="chip"
                key={command}
                onClick={() => setMessage(command)}
                type="button"
              >
                {command}
              </button>
            ))}
          </div>
          <form className="executarChatForm" onSubmit={sendMessage}>
            <input
              aria-label="Mensagem ao Copiloto"
              onChange={(event) => setMessage(event.target.value)}
              placeholder="O que faço agora?"
              value={message}
            />
            <button className="primaryBtn" type="submit">Enviar</button>
          </form>
        </aside>
      )}
      {evidenceOpen && focus && (
        <div className="executarEvidenceBackdrop">
          <div aria-labelledby="executar-evidencia-titulo" aria-modal="true" className="executarEvidenceDialog" role="dialog">
            <form className="dialogCard" onSubmit={saveEvidence}>
              <div className="dialogHead">
                <div>
                  <small>COMPROVAR</small>
                  <h3 id="executar-evidencia-titulo">{focus.title}</h3>
                </div>
                <button
                  aria-label="Fechar evidência"
                  className="iconBtn"
                  onClick={() => setEvidenceOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </div>
              <label>
                O que comprova que terminou?
                <textarea
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ex.: publicado, teste passou, registro salvo..."
                  rows={4}
                  value={note}
                />
              </label>
              <label>
                Ligação opcional
                <input
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://"
                  type="url"
                  value={url}
                />
              </label>
              <label className="filePick">
                Adicionar arquivo · máximo 2,5 MB
                <input
                  onChange={(event) =>
                    setEvidenceFile(event.target.files?.[0] ?? null)
                  }
                  type="file"
                />
              </label>
              <label className="executarVerificacao">
                <input
                  checked={verified}
                  onChange={(event) => setVerified(event.target.checked)}
                  type="checkbox"
                />
                Verifiquei a entrega e confirmei a evidência.
              </label>
              {error && <p className="executarErro" role="alert">{error}</p>}
              <div className="dialogActions">
                <button
                  className="softBtn"
                  onClick={() => setEvidenceOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="primaryBtn"
                  disabled={
                    !(
                      verified &&
                      (note.trim() || url.trim() || evidenceFile)
                    )
                  }
                  type="submit"
                >
                  Salvar e concluir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
