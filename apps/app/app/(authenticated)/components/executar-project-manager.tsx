import { type FormEvent, useState } from "react";
import {
  adicionarEntrega,
  atualizarCapacidadeProjeto,
  criarProjeto,
  type Entrega,
  type EstadoOperacional,
  editarEntrega,
  entregasAtivas,
  estadoEntrega,
  exportarPlano,
  importarPlano,
  projetoAtivo,
  ROTULOS_ESTADO,
  removerEntrega,
  renomearProjeto,
  selecionarProjeto,
} from "@/lib/executar/domain";

const DEPENDENCY_SEPARATOR_PATTERN = /[,;]+/;

/**
 * Diálogo de gestão de projetos/entregas — extraído de
 * executar-operacional.tsx na correção estrutural da auditoria de
 * 02/09/2026. Auto-contido: possui seu próprio estado de formulário
 * (nome do projeto, campos de nova/edição de entrega, importação), só
 * recebe `state`/`setState`/`onClose` de fora.
 */
export function ProjectManager({
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
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);

  function execute(action: () => EstadoOperacional, success: string) {
    try {
      setState(action());
      setProblem("");
      setNotice(success);
    } catch (error) {
      setNotice("");
      setProblem(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o projeto."
      );
    }
  }

  function createProject() {
    try {
      const created = criarProjeto(state, newProjectName);
      const next = created.projects.at(-1);

      if (!next) {
        throw new Error("O projeto criado não foi encontrado.");
      }
      setState(selecionarProjeto(created, next.id));
      setProjectName(next.name);
      setDailyCapacity(String(next.dailyCapacityMinutes));
      setNewProjectName("");
      setProblem("");
      setNotice("Projeto criado e selecionado.");
    } catch (error) {
      setProblem(
        error instanceof Error ? error.message : "Não foi possível criar."
      );
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
        .split(DEPENDENCY_SEPARATOR_PATTERN)
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
            <button
              className="primaryBtn"
              onClick={createProject}
              type="button"
            >
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
                  <b>
                    {task.id} · {task.title}
                  </b>
                  <small>
                    {task.date} · {task.mins} min ·{" "}
                    {ROTULOS_ESTADO[estadoEntrega(task, state)]}
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
                    if (pendingRemovalId !== task.id) {
                      setPendingRemovalId(task.id);
                      setProblem("");
                      setNotice(
                        `Confirme a remoção de ${task.id} clicando novamente.`
                      );
                      return;
                    }

                    setPendingRemovalId(null);
                    execute(
                      () => removerEntrega(state, task.id),
                      "Entrega removida."
                    );
                  }}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
            {!tasks.length && (
              <small>Nenhuma entrega. Adicione ou importe um plano.</small>
            )}
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
                file
                  .text()
                  .then(setImportContent)
                  .catch(() => {
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
                  <a
                    download={proof.file.name}
                    href={
                      proof.file.storagePath
                        ? `/api/executar/evidence?path=${encodeURIComponent(proof.file.storagePath)}`
                        : proof.file.data
                    }
                  >
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

        {notice && <output className="executarNotice">{notice}</output>}
        {problem && (
          <p className="executarErro" role="alert">
            {problem}
          </p>
        )}
      </div>
    </div>
  );
}
