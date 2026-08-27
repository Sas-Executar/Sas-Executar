import type { DiaSemanaProjetado } from "@/lib/executar/mapa-os-projection";

interface CalendarBarProperties {
  readonly week: readonly DiaSemanaProjetado[];
}

/** Reaproveitado por Admin e Notas — mesmo componente, per Onboarding.md §9. */
export function CalendarBar({ week }: CalendarBarProperties) {
  return (
    <section aria-label="Calendário semanal" className="mapaOsCalendarBar">
      {week.map((dia) => (
        <div className={`mapaOsCalendarDay ${dia.state}`} key={dia.date}>
          <span>{dia.day}</span>
          <strong>{dia.date.slice(0, 2)}</strong>
          <i aria-hidden="true" />
        </div>
      ))}
    </section>
  );
}
