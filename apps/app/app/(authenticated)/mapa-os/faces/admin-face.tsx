import {
  Bot,
  CheckCircle2,
  LogIn,
  LogOut,
  SlidersHorizontal,
} from "lucide-react";
import type {
  AcaoScannerId,
  MapaOSProjecao,
} from "@/lib/executar/mapa-os-projection";
import { ESPESSURA_TRACO_ICONE } from "@/lib/executar/symbol-recognizer";
import { CalendarBar } from "./calendar-bar";
import { FaceHeader } from "./face-header";

const ICONE_ACAO: Record<AcaoScannerId, typeof LogIn> = {
  entrada: LogIn,
  copiloto: Bot,
  seletor: SlidersHorizontal,
  feito: CheckCircle2,
  saida: LogOut,
};

interface AdminFaceProperties {
  readonly admin: MapaOSProjecao["admin"];
}

/**
 * A1 · ADMIN/ATALHO — calendário semanal + 5 ações do Scanner.
 *
 * As 5 ações NÃO carregam QR (decisão do usuário, 28/08/2026): o Scanner as
 * reconhece pelo próprio desenho do ícone (o mesmo `lucide-react` usado aqui
 * na tela é a referência do reconhecedor — ver
 * `lib/executar/symbol-recognizer.ts`), não por um código decodificado. O
 * papel fica limpo — só o ícone, sem elemento de máquina sobreposto — e o
 * reconhecimento é tão instantâneo quanto ler um QR. QR continua existindo
 * no Mapa-OS só para os destinos que não têm forma fixa própria (day card →
 * tarefa, nota → documentos, header → jump) — ver `FaceHeader`.
 */
export function AdminFace({ admin }: AdminFaceProperties) {
  return (
    <section aria-label="Face Admin" className="mapaOsFace admin">
      <FaceHeader qrValue="executar://scan/entrada" title="ADMIN">
        <CalendarBar week={admin.week} />
      </FaceHeader>
      <div className="mapaOsFaceMain">
        <div className="mapaOsAdminActions">
          {admin.actions.map((acao) => {
            const Icone = ICONE_ACAO[acao.id];

            return (
              <div className="mapaOsAdminAction" key={acao.id}>
                <div className="mapaOsActionSquare">
                  <Icone
                    aria-hidden="true"
                    strokeWidth={ESPESSURA_TRACO_ICONE}
                  />
                </div>
                <span>{acao.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <footer aria-hidden="true" className="mapaOsFaceFooter" />
    </section>
  );
}
