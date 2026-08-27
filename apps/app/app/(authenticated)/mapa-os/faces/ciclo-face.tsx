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
}

function DayCard({ card }: DayCardProperties) {
  return (
    <article
      className={`mapaOsDayCard ${card.placeholder ? "placeholder" : ""}`}
    >
      <div className="mapaOsDayMeta">
        <strong>{card.day}</strong>
        <span>{card.duration}</span>
        <time>{card.date}</time>
      </div>
      <h3 className={card.deliverable ? "" : "placeholder"}>
        {card.deliverable ?? "— sem entrega"}
      </h3>
      <div className="mapaOsWorkflowGrid">
        {card.workflows.map((workflow, index) => (
          <div
            className={`mapaOsWorkflowCard ${workflow.placeholder ? "placeholder" : ""}`}
            // biome-ignore lint/suspicious/noArrayIndexKey: slots são posicionais e fixos (sempre 3)
            key={index}
          >
            <div className="mapaOsWorkflowMeta">
              <span>{workflow.placeholder ? "—" : workflow.steps}</span>
            </div>
            <p>{workflow.label}</p>
          </div>
        ))}
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
            <DayCard card={card} key={`${card.date}-${index}`} />
          ))}
        </div>
      </div>
      <footer aria-hidden="true" className="mapaOsFaceFooter" />
    </section>
  );
}
