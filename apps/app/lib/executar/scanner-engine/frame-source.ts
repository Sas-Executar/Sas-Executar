/**
 * Fonte única de frames — PR-04 do plano "Scanner OCR-first V2" (handoff
 * §"frame-source.ts"): "Único consumidor da câmera. Nenhum OCR, QR ou
 * detector deve abrir seu próprio polling sobre `<video>`."
 *
 * Hoje `useSymbolScanner` (90ms) e `useTesseractSymbolScanner` (620ms)
 * mantêm dois `setInterval` independentes lendo o mesmo `<video>`, cada um
 * com seu próprio canvas/ROI. `criarFrameSource` substitui isso por UM
 * único temporizador com múltiplos assinantes (`subscribe`) — cada
 * consumidor (OCR, forma, e futuramente outros) recebe o mesmo frame
 * capturado, sem abrir seu próprio laço.
 *
 * Independente de React/DOM: `capturarFrame` é injetado pelo chamador
 * (que decide COMO capturar — vídeo real, canvas fake, fixture de teste).
 * Este módulo só decide QUANDO capturar e PARA QUEM distribuir.
 *
 * Escopo desta PR: só a fonte de frames em si. A migração real de
 * `scanner-client.tsx` para consumir uma única fonte compartilhada entre
 * OCR e reconhecimento de forma fica para PR-07 (ScannerClient Adapter).
 */

export type FrameListener<TFrame> = (frame: TFrame) => void;

export interface FrameSource<TFrame> {
  /** Verdadeiro enquanto o temporizador estiver ativo. */
  readonly isRunning: boolean;
  start(): void;
  stop(): void;
  subscribe(listener: FrameListener<TFrame>): () => void;
}

export interface CriarFrameSourceOptions<TFrame> {
  /** Retorna o frame atual, ou `null` quando não há um frame utilizável (ex.: vídeo ainda carregando). `null` nunca é distribuído aos assinantes. */
  readonly capturarFrame: () => TFrame | null;
  readonly intervalMs: number;
}

export function criarFrameSource<TFrame>({
  capturarFrame,
  intervalMs,
}: CriarFrameSourceOptions<TFrame>): FrameSource<TFrame> {
  const listeners = new Set<FrameListener<TFrame>>();
  let timer: ReturnType<typeof setInterval> | null = null;

  function tick(): void {
    const frame = capturarFrame();

    if (frame === null) {
      return;
    }

    for (const listener of listeners) {
      listener(frame);
    }
  }

  return {
    get isRunning() {
      return timer !== null;
    },
    start() {
      if (timer !== null) {
        return;
      }

      timer = setInterval(tick, intervalMs);
    },
    stop() {
      if (timer === null) {
        return;
      }

      clearInterval(timer);
      timer = null;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
