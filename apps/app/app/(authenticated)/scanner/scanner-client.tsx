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
  type RecognitionResult,
  resolverPayloadScanner,
  ScannerConfirmacaoNecessariaError,
} from "@/lib/executar/scanner";
import {
  type ComandoDespachado,
  despacharComando,
  useScannerEngine,
} from "@/lib/executar/scanner-engine";
import { useEstadoOperacionalLocal } from "@/lib/executar/use-estado-local";
import "./scanner.css";

const JANELA_UNDO_MS = 8000;
const JANELA_RECONHECIMENTO_DUPLICADO_MS = 3000;

interface ScannerClientProperties {
  readonly organizationId: string;
}

type Fase = "camera" | "confirmar-feito" | "resultado" | "seletor";
type MetodoReconhecimento = "manual" | "ocr" | "qr";

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

  /**
   * Aplica um `ComandoDespachado` (`command-dispatcher.ts`, PR-06) no estado
   * de UI do Scanner — o mesmo formato de resultado que os branches de
   * `despachar()` abaixo produzem manualmente para o caminho QR. Usado pelo
   * caminho OCR (`scannerEngine`, via o efeito logo adiante).
   */
  function aplicarComando(comando: ComandoDespachado) {
    switch (comando.kind) {
      case "entrada":
      case "feito":
        atualizarEstadoLocal(comando.stateResultante);
        vibrarMudancaEstado();
        setUndoDisponivel(comando.stateAnterior);
        setMensagem(comando.mensagem);
        setFase("resultado");
        return;
      case "feito_confirmacao_necessaria":
        setFase("confirmar-feito");
        return;
      case "saida":
        setMensagem(`${comando.relatorioDoDia}\n\n${comando.resumoAmanha}`);
        setFase("resultado");
        return;
      case "copiloto":
        setMensagem(comando.mensagem);
        setFase("resultado");
        return;
      case "seletor":
        setFase("seletor");
        return;
      case "erro":
        setErro(comando.mensagem);
        setFase("resultado");
        return;
      default: {
        const _exaustivo: never = comando;
        return _exaustivo;
      }
    }
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
      setErro("QR não reconhecido pelo EXECUTAR.");
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
    if (!(loaded && fase === "camera" && videoRef.current)) {
      return;
    }

    let ativo = true;
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        if (ativo) {
          processarPayloadRef.current(result.data, "qr", 0);
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

  // Reconhecimento OCR-first dos 5 símbolos administrativos (Entrada/
  // Copiloto/Seletor/Feito/Saída) — PR-07 do plano "Scanner OCR-first V2":
  // único consumidor OCR/forma do <video>, substituindo `useSymbolScanner`
  // (forma) e `useTesseractSymbolScanner` (OCR ad hoc, laço próprio) por um
  // único pipeline CAMERA→FRAME SOURCE→QUALITY GATE→ROI→OCR→RESOLVER→
  // CONSENSUS (`scanner-engine/`, PR-02 a PR-05). QR continua com seu
  // próprio laço de decodificação acima (`qr-scanner`) — a PR-11 (última
  // do plano) provou que isso não é mais uma dependência funcional: os 5
  // comandos abaixo resolvem inteiramente pelo caminho OCR, sem QR em
  // lugar nenhum (ver `apps/app/__tests__/scanner-qr-independencia.test.ts`
  // e o comentário em `use-scanner-engine.ts`). QR permanece só para os
  // payloads que esse vocabulário nunca cobriu (link de tarefa/documento,
  // atalho de destino) — unificar os dois laços de captura continua fora
  // de escopo, agora só por arquitetura/risco de regressão, não por
  // independência.
  const scannerEngine = useScannerEngine({
    ativo: loaded && fase === "camera" && !cameraIndisponivel,
    videoRef,
  });

  const ultimaRecognitionDespachada = useRef<RecognitionResult | null>(null);
  const aplicarComandoRef = useRef(aplicarComando);
  useEffect(() => {
    aplicarComandoRef.current = aplicarComando;
  });

  useEffect(() => {
    const recognition = scannerEngine.snapshot.lastRecognition;

    if (!recognition || recognition === ultimaRecognitionDespachada.current) {
      return;
    }

    ultimaRecognitionDespachada.current = recognition;
    setErro("");
    setDiagnostico({
      latencyMs: recognition.recognitionLatencyMs,
      metodo: "ocr",
    });
    aplicarComandoRef.current(
      despacharComando(recognition, entregasAtivas(state), state)
    );
  }, [scannerEngine.snapshot.lastRecognition, state]);

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
            {/** biome-ignore lint/a11y/useMediaCaption: vídeo é a prévia ao vivo da câmera, sem trilha de áudio/legenda aplicável. */}
            <video className="scannerVideo" ref={videoRef} />
            <div aria-hidden="true" className="scannerSymbolGuide" />
          </div>
          <p className="scannerDica">
            QR de tarefa/documento: qualquer posição. Símbolo de ação
            (Entrada/Copiloto/Seletor/Feito/Saída): centralize o ícone e o nome
            no quadro.
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
              processarPayload(entradaManual, "manual", 0);
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
          <p
            aria-live="polite"
            className="scannerDiagnostico"
            data-latency-budget-ms="3000"
            data-ocr-state={scannerEngine.snapshot.state}
          >
            OCR {scannerEngine.snapshot.state}
            {diagnostico
              ? ` · ${diagnostico.metodo} · ${diagnostico.latencyMs} ms`
              : " · aguardando símbolo"}
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
