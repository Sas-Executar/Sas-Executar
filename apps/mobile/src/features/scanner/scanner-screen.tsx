import type { ProjecaoEstadoMobile } from "@repo/executar-contracts/mobile";
import {
  type AcaoScannerReconhecida,
  resolverPayloadScanner,
} from "@repo/executar-contracts/scanner";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Paragraph, SizableText, YStack } from "tamagui";

/**
 * Scanner móvel — reconhece o mesmo esquema `executar://...` do Scanner web
 * (via @repo/executar-contracts/scanner, compartilhado). Não executa nenhuma
 * mutação: o app móvel já opera sob o "Gate Mobile" existente (ver
 * execution-screen.tsx: "Escritas móveis continuam bloqueadas... até
 * evidência verificada e aprovação humana estarem integradas"). Ações como
 * Entrada/Feito/Saída aqui só confirmam o reconhecimento e mostram o mesmo
 * aviso de proteção — a escrita real acontece pelo app web até o Gate Mobile
 * ser aberto por uma decisão de produto explícita.
 */

interface ScannerScreenProps {
  readonly onClose: () => void;
  readonly projection: ProjecaoEstadoMobile | null;
}

const MENSAGENS_ACAO: Record<AcaoScannerReconhecida["kind"], string> = {
  entrada: "Entrada reconhecida.",
  copiloto: "Copiloto reconhecido.",
  seletor: "Seletor reconhecido.",
  feito: "Feito reconhecido.",
  saida: "Saída reconhecida.",
  qr_jump: "QR Jump reconhecido.",
  destino: "Destino reconhecido.",
  tarefa: "Tarefa reconhecida.",
};

function descreverAcao(
  acao: AcaoScannerReconhecida,
  projection: ProjecaoEstadoMobile | null
): string {
  if (
    acao.kind === "entrada" ||
    acao.kind === "feito" ||
    acao.kind === "saida"
  ) {
    return `${MENSAGENS_ACAO[acao.kind]} Escrita bloqueada pelo Gate Mobile — conclua pelo app web até evidência verificada e aprovação humana estarem integradas no celular.`;
  }

  if (acao.kind === "qr_jump" || acao.kind === "tarefa") {
    return projection?.focus
      ? `Tarefa mais recente em foco: "${projection.focus.title}".`
      : "Nenhuma tarefa em foco no momento.";
  }

  return MENSAGENS_ACAO[acao.kind];
}

export function ScannerScreen({ onClose, projection }: ScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const ultimoPayload = useRef<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  function processarPayload(payload: string) {
    if (payload === ultimoPayload.current) {
      return;
    }

    ultimoPayload.current = payload;

    const acao = resolverPayloadScanner(payload);

    if (!acao) {
      setMensagem("QR não reconhecido pelo EXECUTAR.");
      return;
    }

    setMensagem(descreverAcao(acao, projection));
  }

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <YStack
          style={{ flex: 1, gap: 16, justifyContent: "center", padding: 20 }}
        >
          <SizableText
            style={{ color: "#F4F6F5", fontSize: 18, fontWeight: "600" }}
          >
            Câmera necessária
          </SizableText>
          <Paragraph style={{ color: "#9A9BA3" }}>
            Autorize a câmera para escanear o Prisma/Tripé impresso.
          </Paragraph>
          <Button
            onPress={() => requestPermission()}
            style={{ backgroundColor: "#E8A317", borderRadius: 12 }}
          >
            Autorizar câmera
          </Button>
          <Button chromeless color="#9A9BA3" onPress={onClose}>
            Voltar
          </Button>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <YStack style={{ flex: 1, gap: 16, padding: 20 }}>
        <SizableText
          style={{ color: "#F4F6F5", fontSize: 18, fontWeight: "600" }}
        >
          Scanner
        </SizableText>
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={(result) => processarPayload(result.data)}
          style={styles.camera}
        />
        {mensagem && (
          <YStack
            style={{
              backgroundColor: "#1F2027",
              borderRadius: 16,
              gap: 12,
              padding: 16,
            }}
          >
            <Paragraph style={{ color: "#F4F6F5" }}>{mensagem}</Paragraph>
            <Button
              onPress={() => {
                ultimoPayload.current = null;
                setMensagem(null);
              }}
              style={{ backgroundColor: "#33343D", borderRadius: 10 }}
            >
              Escanear de novo
            </Button>
          </YStack>
        )}
        <Button chromeless color="#9A9BA3" onPress={onClose}>
          Fechar
        </Button>
      </YStack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  camera: {
    borderRadius: 20,
    height: 340,
    overflow: "hidden",
    width: "100%",
  },
  container: {
    backgroundColor: "#16161A",
    flex: 1,
  },
});
