"use client";

import { OrganizationSwitcher, UserButton } from "@repo/auth/client";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  assumirFoco,
  chaveOrganizacao,
  concluirEntrega,
  dependenciasPendentes,
  estadoEntrega,
  executarCopiloto,
  filaBloqueada,
  filaPronta,
  focoAtual,
  novoEstado,
  progresso,
  registrarEvidencia,
  registrarPasso,
  restaurarEstado,
  ROTULOS_ESTADO,
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

function Overview({
  state,
  focus,
  changeView,
}: {
  readonly state: EstadoOperacional;
  readonly focus: Entrega | null;
  readonly changeView: (view: View) => void;
}) {
  const current = progresso(ENTREGAS_SPRINT, state);
  const fronts = ["Desenvolvimento", "Criativo", "Operações"];

  return (
    <>
      <div className="kpis">
        {[
          ["Planejado", formatarMinutos(current.total), "para fechar a fase"],
          ["Proteção", "5h45", "sem ampliar escopo"],
          ["Não pode atrasar", "27h30", "caminho principal"],
          [
            "Concluído",
            `${current.percentage}%`,
            `${state.done.length} de ${ENTREGAS_SPRINT.length} entregas`,
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
              const minutes = ENTREGAS_SPRINT.filter(
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
                        width: `${Math.round((minutes / current.total) * 100)}%`,
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
  focus,
  setState,
  openEvidence,
}: {
  readonly state: EstadoOperacional;
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

  const ready = filaPronta(ENTREGAS_SPRINT, state).filter(
    (task) => task.id !== focus.id
  );
  const blocked = filaBloqueada(ENTREGAS_SPRINT, state);
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
                  task && setState(assumirFoco(ENTREGAS_SPRINT, state, task.id))
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
                setState(registrarPasso(ENTREGAS_SPRINT, state, focus.id))
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
  return (
    <>
      <div className="card">
        <div className="cardHead">
          <h2>Resultados por dia</h2>
          <span>10 dias úteis</span>
        </div>
        <div className="cardBody calendarGrid">
          {DIAS.map(([weekday, date, result], index) => {
            const tasks = ENTREGAS_SPRINT.filter((task) => task.date === date);
            const minutes = tasks.reduce((total, task) => total + task.mins, 0);

            return (
              <div className={`dayCard ${index === 0 ? "now" : ""}`} key={date}>
                <div className="dow">{weekday}</div>
                <div className="num">{date.slice(0, 2)}</div>
                <h3>{result}</h3>
                <p>{tasks.length} entregas programadas.</p>
                <footer>
                  <span>{formatarMinutos(minutes)}</span>
                  <span>{tasks.filter((task) => state.done.includes(task.id)).length} feitas</span>
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
          {[
            ["Ciclo 1", "24–26 ago"],
            ["Ciclo 2", "27–31 ago"],
            ["Ciclo 3", "01–03 set"],
            ["Fechamento", "04 set"],
          ].map(([title, dates], index) => (
            <div className={`cycle ${index === 0 ? "now" : ""}`} key={title}>
              <i>{index === 0 ? "●" : ""}</i>
              <b>{title}</b>
              <small>{dates}</small>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Path({ state }: { readonly state: EstadoOperacional }) {
  return (
    <div className="card pathCard">
      <div className="cardHead">
        <h2>O que libera o quê</h2>
        <span>azul = entrega liberada; cinza = dependência pendente</span>
      </div>
      <div className="cardBody executarPath">
        {[1, 2, 3, 4].map((stage) => (
          <section className="executarPathColumn" key={stage}>
            <h3>Etapa {stage}</h3>
            {ENTREGAS_SPRINT.filter((task) => task.stage === stage).map((task) => {
              const status = estadoEntrega(task, state);
              const waiting = dependenciasPendentes(task, state);

              return (
                <article
                  className={`executarPathNode ${status === "READY" || status === "DOING" ? "hot" : ""}`}
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

export function ExecutarOperacional({
  organizationId,
}: ExecutarOperacionalProperties) {
  const [state, setState] = useState(() => novoEstado(organizationId));
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>("overview");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MensagemCopiloto[]>([
    {
      author: "copiloto",
      text: "Posso orientar a execução real. Pergunte “o que faço agora?” ou use /estado.",
    },
  ]);

  useEffect(() => {
    const stored = window.localStorage.getItem(chaveOrganizacao(organizationId));
    setState(restaurarEstado(stored, organizationId));
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

  const focus = useMemo(() => focoAtual(ENTREGAS_SPRINT, state), [state]);
  const title = VIEWS.find((item) => item.id === view)?.label ?? "Visão geral";

  function saveEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!focus) {
      return;
    }

    try {
      const withEvidence = registrarEvidencia(
        ENTREGAS_SPRINT,
        state,
        focus.id,
        note,
        url,
        verified
      );

      setState(concluirEntrega(ENTREGAS_SPRINT, withEvidence, focus.id));
      setEvidenceOpen(false);
      setNote("");
      setUrl("");
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

    const answer = executarCopiloto(ENTREGAS_SPRINT, state, message);
    setMessages((previous) => [
      ...previous,
      { author: "pessoa", text: message.trim() },
      { author: "copiloto", text: answer.reply },
    ]);
    setMessage("");
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
              <div className="eyebrow">PRÓXIMO 1 POR VEZ</div>
              <h1>{view === "path" ? "Caminho do resultado" : title}</h1>
            </div>
            <div className="topActions">
              <span className="dateChip">24 ago — 04 set</span>
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
            <Overview changeView={setView} focus={focus} state={state} />
          )}
          {view === "focus" && (
            <Focus
              focus={focus}
              openEvidence={() => setEvidenceOpen(true)}
              setState={setState}
              state={state}
            />
          )}
          {view === "calendar" && <Calendar state={state} />}
          {view === "path" && <Path state={state} />}
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
          </div>
          <div className="executarComandos">
            {["/agora", "/estado", "/fechardia"].map((command) => (
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
                  disabled={!(verified && (note.trim() || url.trim()))}
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

