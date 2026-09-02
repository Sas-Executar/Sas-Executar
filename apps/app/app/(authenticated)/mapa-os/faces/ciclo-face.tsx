import type { MapaOSProjecao } from "@/lib/executar/mapa-os-projection";
import { FaceHeader } from "./face-header";

interface RoutineBarProperties {
  readonly routine: MapaOSProjecao["ciclo"]["routine"];
}

function RoutineBar({ routine }: RoutineBarProperties) {
  return (
    <section aria-label="Linha temporal da rotina" className="mapaOsRoutineBar">
      {routine.map((no) => (
        <div className={`mapaOsRoutineStep ${no.state}`} key={no.id}>
          <div aria-hidden="true" className="mapaOsRoutineNode">
            {no.state === "done" ? "✓" : ""}
          </div>
          <strong>{no.label}</strong>
          <span>{no.meta}</span>
          <small>{no.status}</small>
        </div>
      ))}
    </section>
  );
}

interface DayCardProperties {
  readonly card: MapaOSProjecao["ciclo"]["dayCards"][number];
  readonly index: number;
}

/**
 * Epic-card — mesma anatomia do protótipo "Centro de Comando" (numeral +
 * meta + barra de progresso, entregável em destaque, checklist de tarefas),
 * adaptada pra caber no footprint mm já aprovado do Prisma/Tripé (6 cards
 * numa grade 3×2/2×3, não os 2-3 cards largos do protótipo original).
 */
function DayCard({ card, index }: DayCardProperties) {
  return (
    <article
      className={`mapaOsDayCard ${card.placeholder ? "placeholder" : ""}`}
    >
      <div className="mapaOsEpicHead">
        <span className="mapaOsEpicNum">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="mapaOsEpicMeta">
          <strong>{card.day}</strong>
          <time>{card.date}</time>
          <span>{card.duration}</span>
        </div>
        <div className="mapaOsEpicProgress">
          <b>{card.percentage}%</b>
          <div className="mapaOsEpicTrack">
            <div
              className="mapaOsEpicFill"
              style={{ width: `${card.percentage}%` }}
            />
          </div>
        </div>
      </div>
      <h3 className={card.deliverable ? "" : "placeholder"}>
        {card.deliverable ?? "— sem entrega"}
      </h3>
      <div className="mapaOsEpicTasks">
        {card.tasks.map((task) => (
          <div
            className={`mapaOsEpicTask ${task.done ? "done" : ""}`}
            key={task.id}
          >
            <span aria-hidden="true" className="mapaOsEpicTaskCircle" />
            <p>{task.title}</p>
          </div>
        ))}
        {card.tasksOverflow > 0 && (
          <div className="mapaOsEpicTaskMore">
            +{card.tasksOverflow} tarefa{card.tasksOverflow > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </article>
  );
}

interface CicloFaceProperties {
  readonly ciclo: MapaOSProjecao["ciclo"];
}

/** A2 · CICLO/ROTINA — timeline da rotina + 6 Day Cards em grade 3×2. */
export function CicloFace({ ciclo }: CicloFaceProperties) {
  return (
    <section aria-label="Face Ciclo" className="mapaOsFace ciclo">
      <FaceHeader qrValue="executar://roadmap" title="CICLO">
        <RoutineBar routine={ciclo.routine} />
      </FaceHeader>
      <div className="mapaOsFaceMain">
        <div className="mapaOsRoadmapGrid">
          {ciclo.dayCards.map((card, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: sempre 6 slots fixos, mesmo com placeholders repetidos
            <DayCard card={card} index={index} key={`${card.date}-${index}`} />
          ))}
        </div>
      </div>
      <footer aria-hidden="true" className="mapaOsFaceFooter" />
    </section>
  );
}
