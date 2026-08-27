import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";

interface FaceHeaderProperties {
  readonly children: ReactNode;
  readonly qrValue: string;
  readonly title: string;
}

/**
 * Cabeçalho compartilhado por A1/A2/A3: quadrado de título, barra de
 * contexto e QR — a mesma anatomia de header em todas as faces, só o
 * conteúdo da barra de contexto muda (regra do DESIGN_SPEC do protótipo).
 */
export function FaceHeader({ children, qrValue, title }: FaceHeaderProperties) {
  return (
    <header className="mapaOsFaceHeader">
      <div className="mapaOsFaceTitle">{title}</div>
      <div className="mapaOsContextBar">{children}</div>
      <div aria-label={`QR de ${title}`} className="mapaOsQrCell" role="img">
        <QRCodeSVG level="M" marginSize={0} size={42} value={qrValue} />
      </div>
    </header>
  );
}
