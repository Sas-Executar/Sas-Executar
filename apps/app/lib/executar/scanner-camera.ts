export type CodigoFalhaCamera =
  | "abortada"
  | "contexto"
  | "desconhecida"
  | "dispositivo"
  | "ocupada"
  | "permissao"
  | "restricao";

export interface FalhaCamera {
  readonly codigo: CodigoFalhaCamera;
  readonly detalheTecnico: string;
  readonly mensagem: string;
}

function detalhesDaFalha(falha: unknown): {
  readonly message: string;
  readonly name: string;
} {
  if (falha instanceof DOMException || falha instanceof Error) {
    return { message: falha.message, name: falha.name };
  }

  return {
    message: typeof falha === "string" ? falha : "erro não identificado",
    name: "UnknownError",
  };
}

export function diagnosticarFalhaCamera(
  falha: unknown,
  contextoSeguro: boolean,
  possuiGetUserMedia: boolean
): FalhaCamera {
  const detalhe = detalhesDaFalha(falha);
  const detalheTecnico = `${detalhe.name}: ${detalhe.message}`;

  if (!(contextoSeguro && possuiGetUserMedia)) {
    return {
      codigo: "contexto",
      detalheTecnico,
      mensagem:
        "A câmera exige HTTPS e suporte a acesso de mídia neste navegador.",
    };
  }

  switch (detalhe.name) {
    case "NotAllowedError":
    case "SecurityError":
      return {
        codigo: "permissao",
        detalheTecnico,
        mensagem:
          "Acesso à câmera bloqueado. Autorize a câmera para este site no Safari e tente novamente.",
      };
    case "NotFoundError":
      return {
        codigo: "dispositivo",
        detalheTecnico,
        mensagem: "Nenhuma câmera compatível foi encontrada neste aparelho.",
      };
    case "NotReadableError":
      return {
        codigo: "ocupada",
        detalheTecnico,
        mensagem:
          "A câmera não pôde ser aberta. Feche outras abas ou apps que estejam usando-a e tente novamente.",
      };
    case "OverconstrainedError":
      return {
        codigo: "restricao",
        detalheTecnico,
        mensagem:
          "A câmera disponível não atende à configuração solicitada. Tente novamente.",
      };
    case "AbortError":
      return {
        codigo: "abortada",
        detalheTecnico,
        mensagem: "A inicialização da câmera foi interrompida. Tente novamente.",
      };
    default:
      return {
        codigo: "desconhecida",
        detalheTecnico,
        mensagem:
          "Não foi possível iniciar a câmera. Tente novamente ou use a entrada manual.",
      };
  }
}
