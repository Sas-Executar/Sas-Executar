import type { MapaOSProjecao } from "@/lib/executar/mapa-os-projection";
import { AdminFace } from "./faces/admin-face";
import { CicloFace } from "./faces/ciclo-face";
import { NotasFace } from "./faces/notas-face";

export type FormatoMapaOS = "prisma" | "tripe";

interface MapaOSSheetProperties {
  readonly format: FormatoMapaOS;
  readonly projecao: MapaOSProjecao;
  readonly showGuides: boolean;
}

/**
 * O mesmo conteúdo canônico (A1 → A2 → A3) em duas geometrias físicas:
 * Prisma empilha as três faces verticalmente (A4 retrato); Tripé as
 * distribui lado a lado (A4 paisagem). Nenhum dos dois componentes de face
 * muda — só a classe de layout do envoltório (ver mapa-os.css).
 */
export function MapaOSSheet({
  format,
  projecao,
  showGuides,
}: MapaOSSheetProperties) {
  return (
    <div className={`mapaOsSheet ${format} ${showGuides ? "showGuides" : ""}`}>
      <div className="mapaOsSafeArea">
        <AdminFace admin={projecao.admin} />
        <div aria-hidden="true" className="mapaOsFold">
          <span>DOBRA</span>
        </div>
        <CicloFace ciclo={projecao.ciclo} />
        <div aria-hidden="true" className="mapaOsFold">
          <span>DOBRA</span>
        </div>
        <NotasFace admin={projecao.admin} notas={projecao.notas} />
      </div>
      <div aria-hidden="true" className="mapaOsCutGuide" />
    </div>
  );
}
