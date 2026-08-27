"use client";

import { LayoutGrid, Printer } from "lucide-react";
import type { FormatoMapaOS } from "./mapa-os-sheet";

interface MapaOSPrintControlsProperties {
  readonly format: FormatoMapaOS;
  readonly onFormatChange: (format: FormatoMapaOS) => void;
  readonly onToggleGuides: () => void;
  readonly showGuides: boolean;
}

export function MapaOSPrintControls({
  format,
  onFormatChange,
  onToggleGuides,
  showGuides,
}: MapaOSPrintControlsProperties) {
  return (
    <nav aria-label="Controles de visualização" className="mapaOsPrintControls">
      <div className="mapaOsBrand">
        <span>EXECUTAR</span>
        <strong>Mapa-OS · Prisma / Tripé</strong>
      </div>
      <fieldset className="mapaOsFormatSwitch">
        <legend className="mapaOsVisuallyHidden">Formato do papel</legend>
        <button
          aria-pressed={format === "prisma"}
          onClick={() => onFormatChange("prisma")}
          type="button"
        >
          Prisma (A4 retrato)
        </button>
        <button
          aria-pressed={format === "tripe"}
          onClick={() => onFormatChange("tripe")}
          type="button"
        >
          Tripé (A4 paisagem)
        </button>
      </fieldset>
      <button onClick={onToggleGuides} type="button">
        <LayoutGrid aria-hidden="true" size={17} />
        {showGuides ? "Ocultar guias" : "Mostrar guias"}
      </button>
      <button className="primary" onClick={() => window.print()} type="button">
        <Printer aria-hidden="true" size={17} />
        Imprimir A4
      </button>
    </nav>
  );
}
