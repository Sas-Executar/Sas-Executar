import {
  calendarioProjeto,
  caminhoCritico,
  ciclosProjeto,
  dependenciasPendentes,
  type Entrega,
  type EstadoOperacional,
  estadoEntrega,
  progresso,
  projetoAtivo,
  ROTULOS_ESTADO,
} from "@/lib/executar/domain";

/**
 * Views "Projetos" (Overview), "Calendário" e "Caminho" do dashboard —
 * extraídas de executar-operacional.tsx na correção estrutural da
 * auditoria de 02/09/2026. Cada uma é presentacional e sem estado próprio,
 * derivando tudo de `state`/`tasks` recebidos via props.
 */

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

export function Overview({
  state,
  tasks,
  focus,
  changeView,
}: {
  readonly state: EstadoOperacional;
  readonly tasks: readonly Entrega[];
  readonly focus: Entrega | null;
  readonly changeView: () => void;
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
                <span>{label}</span>
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
            <div
              aria-label="Oito rotas de entrega"
              className="routeRing"
              role="img"
            />
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
          onClick={changeView}
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
              const minutes = tasks
                .filter((task) => task.front === front)
                .reduce((total, task) => total + task.mins, 0);

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

export function Calendar({ state }: { readonly state: EstadoOperacional }) {
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
              <div
                className={`dayCard ${index === 0 ? "now" : ""}`}
                key={day.date}
              >
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
            <div
              className={`cycle ${index === 0 ? "now" : ""}`}
              key={cycle.number}
            >
              <i>{index === 0 ? "●" : ""}</i>
              <b>Ciclo {cycle.number}</b>
              <small>
                {cycle.dates[0]}
                {cycle.dates.length > 1 ? `–${cycle.dates.at(-1)}` : ""}
              </small>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function Path({
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
            {tasks
              .filter((task) => task.stage === stage)
              .map((task) => {
                const status = estadoEntrega(task, state);
                const waiting = dependenciasPendentes(task, state);

                return (
                  <article
                    className={`executarPathNode ${critical.has(task.id) ? "hot" : ""}`}
                    key={task.id}
                  >
                    <b>
                      {task.id} · {task.title}
                    </b>
                    <small>{ROTULOS_ESTADO[status]}</small>
                    {!!waiting.length && (
                      <small>Aguarda {waiting.join(", ")}</small>
                    )}
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
