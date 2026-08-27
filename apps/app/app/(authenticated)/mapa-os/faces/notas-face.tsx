import type { MapaOSProjecao } from "@/lib/executar/mapa-os-projection";
import { CalendarBar } from "./calendar-bar";
import { FaceHeader } from "./face-header";

interface NotasFaceProperties {
  readonly admin: MapaOSProjecao["admin"];
  readonly notas: MapaOSProjecao["notas"];
}

/**
 * A3 · NOTAS — três lanes vazias e iguais para post-it físico. Sem
 * conteúdo digital dentro das lanes (regra explícita do Onboarding.md §9):
 * só rótulo + linha de direção colorida.
 */
export function NotasFace({ admin, notas }: NotasFaceProperties) {
  return (
    <section aria-label="Face Notas" className="mapaOsFace notas">
      <FaceHeader qrValue={notas.qrPayload} title="NOTAS">
        <CalendarBar week={admin.week} />
      </FaceHeader>
      <div className="mapaOsFaceMain">
        <div className="mapaOsNotesGrid">
          {notas.lanes.map((lane) => (
            <section className={`mapaOsNotesLane ${lane.id}`} key={lane.id}>
              <h3>{lane.label}</h3>
              <section
                aria-label={`Espaço livre: ${lane.label}`}
                className="mapaOsNotesSpace"
              />
              <i aria-hidden="true" />
            </section>
          ))}
        </div>
      </div>
      <footer aria-hidden="true" className="mapaOsFaceFooter" />
    </section>
  );
}
