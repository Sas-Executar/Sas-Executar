"use client";

import QrScanner from "qr-scanner";
import { useEffect, useRef, useState } from "react";
import {
  type Entrega,
  type EstadoOperacional,
  entregasAtivas,
  executarCopiloto,
} from "@/lib/executar/domain";
import {
  type AcaoScannerReconhecida,
  ATALHOS_PADRAO_SELETOR,
  executarAcaoEntrada,
  executarAcaoFeito,
  executarAcaoSaida,
  idempotencyKeyScanner,
  resolverPayloadScanner,
  ScannerConfirmacaoNecessariaError,
} from "@/lib/executar/scanner";
import { useEstadoOperacionalLocal } from "@/lib/executar/use-estado-local";
import { useSymbolScanner } from "@/lib/executar/use-symbol-scanner";
import "./scanner.css";

const JANELA_UNDO_MS = 8000;

interface ScannerClientProperties {
  readonly organizationId: string;
}

type Fase = "camera" | "confirmar-feito" | "resultado" | "seletor";

export function ScannerClient({ organizationId }: ScannerClientProperties) {
  const { atualizarEstadoLocal, loaded, state } =
    useEstadoOperacionalLocal(organizationId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ultimosScans = useRef(new Map<string, number>());
  const [fase, setFase] = useState<Fase>("camera");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [cameraIndisponivel, setCameraIndisponivel] = useState(false);
  const [entradaManual, setEntradaManual] = useState("");
  const [undoDisponivel, setUndoDisponivel] =
    useState<EstadoOperacional | null>(null);

  function scanDuplicado(acao: string, alvo: string): boolean {
    const chave = idempotencyKeyScanner(organizationId, acao, alvo, Date.now());
    const repetido = ultimosScans.current.has(chave);
    ultimosScans.current.set(chave, Date.now());
    return repetido;
  }

  function concluirFeito(
    tasks: readonly Entrega[],
    estadoAtual: EstadoOperacional,
    confirmado: boolean
  ) {
    try {
      const resultado = executarAcaoFeito(tasks, estadoAtual, confirmado);
      atualizarEstadoLocal(resultado.stateResultante);
      setUndoDisponivel(resultado.stateAnterior);
      setMensagem(resultado.mensagem);
      setFase("resultado");
    } catch (falha) {
      if (falha instanceof ScannerConfirmacaoNecessariaError) {
        setFase("confirmar-feito");
        return;
      }

      setErro(falha instanceof Error ? falha.message : "Falha ao concluir.");
      setFase("resultado");
    }
  }

  function executarEntrada(
    tasks: readonly Entrega[],
    atual: EstadoOperacional
  ) {
    if (scanDuplicado("entrada", atual.activeProjectId)) {
      return;
    }

    const resultado = executarAcaoEntrada(tasks, atual);
    atualizarEstadoLocal(resultado.stateResultante);
    setUndoDisponivel(resultado.stateAnterior);
    setMensagem(resultado.mensagem);
    setFase("resultado");
  }

  function executarSaida(tasks: readonly Entrega[], atual: EstadoOperacional) {
    const resultado = executarAcaoSaida(tasks, atual);
    setMensagem(`${resultado.relatorioDoDia}\n\n${resultado.resumoAmanha}`);
    setFase("resultado");
  }

  function executarCopilotoAcao(
    tasks: readonly Entrega[],
    atual: EstadoOperacional
  ) {
    const briefing = executarCopiloto(tasks, atual, "/bomdia");
    setMensagem(briefing.reply);
    setFase("resultado");
  }

  function navegarParaDestino(
    acao: Extract<AcaoScannerReconhecida, { kind: "destino" }>
  ) {
    const view = acao.destino === "roadmap" ? "calendar" : "documents";
    window.location.href = `/?view=${view}`;
  }

  function despachar(acao: AcaoScannerReconhecida) {
    const tasks = entregasAtivas(state);

    switch (acao.kind) {
      case "entrada":
        executarEntrada(tasks, state);
        return;
      case "feito":
        if (!scanDuplicado("feito", state.focus ?? "sem-foco")) {
          concluirFeito(tasks, state, false);
        }
        return;
      case "saida":
        executarSaida(tasks, state);
        return;
      case "copiloto":
        executarCopilotoAcao(tasks, state);
        return;
      case "seletor":
        setFase("seletor");
        return;
      case "destino":
        navegarParaDestino(acao);
        return;
      case "qr_jump":
      case "tarefa":
        window.location.href = "/?view=now";
        return;
      default:
        setErro("Ação reconhecida, mas ainda sem tratamento no Scanner.");
    }
  }

  function processarPayload(payload: string) {
    setErro("");
    const acao = resolverPayloadScanner(payload);

    if (!acao) {
      setErro("QR não reconhecido pelo EXECUTAR.");
      return;
    }

    try {
      despachar(acao);
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : "Falha ao executar ação."
      );
    }
  }

  const processarPayloadRef = useRef(processarPayload);
  useEffect(() => {
    processarPayloadRef.current = processarPayload;
  });

  useEffect(() => {
    if (!(loaded && fase === "camera" && videoRef.current)) {
      return;
    }

    let ativo = true;
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        if (ativo) {
          processarPayloadRef.current(result.data);
        }
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 5,
      }
    );

    scanner.start().catch(() => setCameraIndisponivel(true));

    return () => {
      ativo = false;
      scanner.stop();
      scanner.destroy();
    };
  }, [loaded, fase]);

  // Reconhecimento dos 5 símbolos administrativos (Entrada/Copiloto/
  // Seletor/Feito/Saída) — roda em paralelo ao decode de QR acima, lendo o
  // mesmo <video> por um <canvas> independente. Sem QR nesses 5 símbolos
  // (decisão do usuário, 28/08/2026) — ver lib/executar/symbol-recognizer.ts.
  useSymbolScanner({
    ativo: loaded && fase === "camera" && !cameraIndisponivel,
    onReconhecido: (id) => processarPayloadRef.current(`executar://scan/${id}`),
    videoRef,
  });

  useEffect(() => {
    if (!undoDisponivel) {
      return;
    }

    const timer = window.setTimeout(
      () => setUndoDisponivel(null),
      JANELA_UNDO_MS
    );
    return () => window.clearTimeout(timer);
  }, [undoDisponivel]);

  function desfazer() {
    if (undoDisponivel) {
      atualizarEstadoLocal(undoDisponivel);
      setUndoDisponivel(null);
      setMensagem("Ação desfeita.");
    }
  }

  function voltarParaCamera() {
    setErro("");
    setMensagem("");
    setFase("camera");
  }

  if (!loaded) {
    return null;
  }

  return (
    <main className="scannerShell">
      <header className="scannerHeader">
        <span>EXECUTAR</span>
        <strong>Scanner</strong>
      </header>

      {fase === "camera" && (
        <section className="scannerCameraArea">
          <div className="scannerCameraFrame">
            {/** biome-ignore lint/a11y/useMediaCaption: vídeo é a prévia ao vivo da câmera, sem trilha de áudio/legenda aplicável. */}
            <video className="scannerVideo" ref={videoRef} />
            <div aria-hidden="true" className="scannerSymbolGuide" />
          </div>
          <p className="scannerDica">
            QR de tarefa/documento: qualquer posição. Símbolo de ação
            (Entrada/Copiloto/Seletor/Feito/Saída): centralize no quadro.
          </p>
          {cameraIndisponivel && (
            <p className="scannerAviso">
              Câmera indisponível neste navegador/aparelho. Digite o conteúdo do
              QR manualmente abaixo (útil também para testes).
            </p>
          )}
          <form
            className="scannerManualForm"
            onSubmit={(event) => {
              event.preventDefault();
              processarPayload(entradaManual);
              setEntradaManual("");
            }}
          >
            <input
              onChange={(event) => setEntradaManual(event.target.value)}
              placeholder="executar://scan/entrada"
              value={entradaManual}
            />
            <button type="submit">Processar</button>
          </form>
          {erro && <p className="scannerErro">{erro}</p>}
        </section>
      )}

      {fase === "confirmar-feito" && (
        <section className="scannerResultado">
          <h2>Sem check-in ativo</h2>
          <p>Confirme para tentar concluir mesmo assim.</p>
          <div className="scannerAcoes">
            <button
              onClick={() => concluirFeito(entregasAtivas(state), state, true)}
              type="button"
            >
              Confirmar
            </button>
            <button onClick={voltarParaCamera} type="button">
              Cancelar
            </button>
          </div>
        </section>
      )}

      {fase === "seletor" && (
        <section className="scannerResultado">
          <h2>Seletor</h2>
          <div className="scannerSeletorLista">
            {ATALHOS_PADRAO_SELETOR.map((atalho) => (
              <button
                key={atalho.id}
                onClick={() => {
                  window.location.href = `/?view=${atalho.destino}`;
                }}
                type="button"
              >
                {atalho.label}
              </button>
            ))}
          </div>
          <button onClick={voltarParaCamera} type="button">
            Voltar
          </button>
        </section>
      )}

      {fase === "resultado" && (
        <section className="scannerResultado">
          {erro ? <p className="scannerErro">{erro}</p> : <p>{mensagem}</p>}
          <div className="scannerAcoes">
            {undoDisponivel && (
              <button onClick={desfazer} type="button">
                Desfazer
              </button>
            )}
            <button onClick={voltarParaCamera} type="button">
              Escanear de novo
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
