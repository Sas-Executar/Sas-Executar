import {
  Bot,
  CheckCircle2,
  LogIn,
  LogOut,
  SlidersHorizontal,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type {
  AcaoScannerId,
  MapaOSProjecao,
} from "@/lib/executar/mapa-os-projection";
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
 * A1 · ADMIN/ATALHO — calendário semanal + 5 ações do Scanner. Cada ação é
 * seu próprio alvo escaneável (`executar://scan/{id}`): a estratégia de
 * reconhecimento por símbolo isolado ficou como questão aberta no FRD do
 * Scanner ("terceiracte"), então usamos o primitivo já disponível e
 * confiável — um QR por ação — em vez de inventar reconhecimento visual.
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
                  <QRCodeSVG
                    level="M"
                    marginSize={0}
                    size={20}
                    value={acao.qrPayload}
                  />
                  <i aria-hidden="true" className="mapaOsActionBadge">
                    <Icone aria-hidden="true" />
                  </i>
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
