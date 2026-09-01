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
import {
  diagnosticarFalhaCamera,
  type FalhaCamera,
} from "@/lib/executar/scanner-camera";
import { useEstadoOperacionalLocal } from "@/lib/executar/use-estado-local";
import { useSymbolScanner } from "@/lib/executar/use-symbol-scanner";
import { useTesseractSymbolScanner } from "@/lib/executar/use-tesseract-symbol-scanner";
import "./scanner.css";

const JANELA_UNDO_MS = 8000;
const JANELA_RECONHECIMENTO_DUPLICADO_MS = 3000;

interface ScannerClientProperties {
  readonly organizationId: string;
}

type Fase = "camera" | "confirmar-feito" | "resultado" | "seletor";
type MetodoReconhecimento = "forma" | "manual" | "ocr" | "qr";

interface DiagnosticoReconhecimento {
  readonly latencyMs: number;
  readonly metodo: MetodoReconhecimento;
}

function vibrarMudancaEstado() {
  navigator.vibrate?.(45);
}

export function ScannerClient({ organizationId }: ScannerClientProperties) {
  const { atualizarEstadoLocal, loaded, state } =
    useEstadoOperacionalLocal(organizationId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ultimosScans = useRef(new Map<string, number>());
  const ultimoReconhecimento = useRef<{
    readonly id: string;
    readonly at: number;
  } | null>(null);
  const [fase, setFase] = useState<Fase>("camera");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [cameraIndisponivel, setCameraIndisponivel] = useState(false);
  const [cameraFalha, setCameraFalha] = useState<FalhaCamera | null>(null);
  const [cameraTentativa, setCameraTentativa] = useState(0);
  const [entradaManual, setEntradaManual] = useState("");
  const [undoDisponivel, setUndoDisponivel] =
    useState<EstadoOperacional | null>(null);
  const [diagnostico, setDiagnostico] =
    useState<DiagnosticoReconhecimento | null>(null);

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
      vibrarMudancaEstado();
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
    vibrarMudancaEstado();
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
        window.location.href = "/?view=workspace";
        return;
      case "tarefa":
        window.location.href = `/?view=workspace&task=${encodeURIComponent(
          acao.taskId
        )}`;
        return;
      default:
        setErro("Ação reconhecida, mas ainda sem tratamento no Scanner.");
    }
  }

  function processarPayload(
    payload: string,
    metodo: MetodoReconhecimento = "manual",
    latencyMs = 0
  ) {
    setErro("");
    const acao = resolverPayloadScanner(payload);

    if (!acao) {
      if (metodo === "manual") {
        setErro("Código EXECUTAR não reconhecido.");
      }
      return;
    }

    const agora = performance.now();
    const reconhecimentoAnterior = ultimoReconhecimento.current;
    const idReconhecimento =
      acao.kind === "tarefa" ? `${acao.kind}:${acao.taskId}` : acao.kind;

    if (
      reconhecimentoAnterior?.id === idReconhecimento &&
      agora - reconhecimentoAnterior.at < JANELA_RECONHECIMENTO_DUPLICADO_MS
    ) {
      return;
    }

    ultimoReconhecimento.current = { id: idReconhecimento, at: agora };
    setDiagnostico({ latencyMs, metodo });

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
    const video = videoRef.current;
    if (!(loaded && fase === "camera" && video)) {
      return;
    }

    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.dataset.cameraAttempt = String(cameraTentativa);

    let ativo = true;
    setCameraIndisponivel(false);
    setCameraFalha(null);

    const scanner = new QrScanner(
      video,
      (result) => {
        if (ativo) {
          processarPayloadRef.current(result.data, "qr", 0);
        }
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 5,
        preferredCamera: "environment",
      }
    );

    const inicioScanner = scanner.start();
    inicioScanner
      .then(() => {
        if (ativo) {
          setCameraIndisponivel(false);
          setCameraFalha(null);
        }
      })
      .catch((falha: unknown) => {
        if (!ativo) {
          return;
        }

        const possuiGetUserMedia = Boolean(navigator.mediaDevices?.getUserMedia);
        const diagnosticoCamera = diagnosticarFalhaCamera(
          falha,
          window.isSecureContext,
          possuiGetUserMedia
        );
        setCameraFalha(diagnosticoCamera);
        setCameraIndisponivel(true);
      });

    return () => {
      ativo = false;
      scanner.stop();
      scanner.destroy();
    };
  }, [cameraTentativa, loaded, fase]);

  useSymbolScanner({
    ativo: loaded && fase === "camera" && !cameraIndisponivel,
    onReconhecido: (id, latencyMs) =>
      processarPayloadRef.current(`executar://scan/${id}`, "forma", latencyMs),
    videoRef,
  });

  const estadoTesseract = useTesseractSymbolScanner({
    ativo: loaded && fase === "camera" && !cameraIndisponivel,
    onReconhecido: ({ id, latencyMs }) =>
      processarPayloadRef.current(`executar://scan/${id}`, "ocr", latencyMs),
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
      vibrarMudancaEstado();
      setUndoDisponivel(null);
      setMensagem("Ação desfeita.");
    }
  }

  function voltarParaCamera() {
    setErro("");
    setMensagem("");
    setFase("camera");
  }

  function tentarCameraNovamente() {
    setCameraIndisponivel(false);
    setCameraFalha(null);
    setCameraTentativa((tentativa) => tentativa + 1);
  }

  if (!loaded) {
    return null;
  }

  return (
    <main className="scannerShell">
      <header className="scannerHeader">
        <button
          aria-label="Voltar para o EXECUTAR"
          className="scannerBackButton"
          onClick={() => {
            window.location.href = "/";
          }}
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="scannerHeaderTitle">
          <span>EXECUTAR</span>
          <strong>Scanner</strong>
        </div>
      </header>

      {fase === "camera" && (
        <section className="scannerCameraArea">
          <div className="scannerCameraFrame">
            <video
              autoPlay
              className="scannerVideo"
              muted
              playsInline
              ref={videoRef}
            />
            <div aria-hidden="true" className="scannerSymbolGuide" />
          </div>
          <p className="scannerDica">
            QR de tarefa/documento: qualquer posição. Para ações, enquadre um
            único símbolo por vez e centralize somente o ícone no quadro azul;
            mantenha o nome logo abaixo.
          </p>
          {cameraIndisponivel && (
            <div className="scannerAviso" role="alert">
              <p>{cameraFalha?.mensagem ?? "Câmera indisponível."}</p>
              {cameraFalha && (
                <small>
                  Diagnóstico: {cameraFalha.codigo} ·{" "}
                  {cameraFalha.detalheTecnico}
                </small>
              )}
              <button onClick={tentarCameraNovamente} type="button">
                Tentar câmera novamente
              </button>
            </div>
          )}
          <form
            className="scannerManualForm"
            onSubmit={(event) => {
              event.preventDefault();
              processarPayload(entradaManual, "manual", 0);
              setEntradaManual("");
            }}
          >
            <input
              aria-label="Código EXECUTAR para teste manual"
              onChange={(event) => setEntradaManual(event.target.value)}
              placeholder="executar://scan/entrada"
              required
              value={entradaManual}
            />
            <button type="submit">Processar</button>
          </form>
          {erro && <p className="scannerErro">{erro}</p>}
          <p
            aria-live="polite"
            className="scannerDiagnostico"
            data-camera-error={cameraFalha?.codigo ?? "none"}
            data-latency-budget-ms="3000"
            data-ocr-state={estadoTesseract}
          >
            Leitura visual ativa · OCR {estadoTesseract}
            {diagnostico
              ? ` · ${diagnostico.metodo} · ${diagnostico.latencyMs} ms`
              : " · aguardando um símbolo"}
          </p>
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
