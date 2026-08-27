"use client";

import { useMemo, useState } from "react";
import { projetarMapaOS } from "@/lib/executar/mapa-os-projection";
import { useEstadoOperacionalLocal } from "@/lib/executar/use-estado-local";
import "./mapa-os.css";
import { MapaOSPrintControls } from "./mapa-os-print-controls";
import { type FormatoMapaOS, MapaOSSheet } from "./mapa-os-sheet";

interface MapaOSClientProperties {
  readonly initialFormat: FormatoMapaOS;
  readonly organizationId: string;
}

export function MapaOSClient({
  initialFormat,
  organizationId,
}: MapaOSClientProperties) {
  const { loaded, state } = useEstadoOperacionalLocal(organizationId);
  const [format, setFormat] = useState<FormatoMapaOS>(initialFormat);
  const [showGuides, setShowGuides] = useState(true);

  const projecao = useMemo(() => {
    const generatedAt = new Date();
    return projetarMapaOS(state, generatedAt.toISOString(), generatedAt);
  }, [state]);

  if (!loaded) {
    return null;
  }

  return (
    <main className="mapaOsShell">
      {/* @page não aceita seletor de classe — o tamanho do papel por
          formato é injetado aqui, sobrescrevendo o fallback de mapa-os.css. */}
      <style>{`@page { margin: 0; size: ${
        format === "tripe" ? "297mm 210mm" : "210mm 297mm"
      }; }`}</style>
      <MapaOSPrintControls
        format={format}
        onFormatChange={setFormat}
        onToggleGuides={() => setShowGuides((value) => !value)}
        showGuides={showGuides}
      />
      <div className="mapaOsStage">
        <MapaOSSheet
          format={format}
          projecao={projecao}
          showGuides={showGuides}
        />
      </div>
    </main>
  );
}
