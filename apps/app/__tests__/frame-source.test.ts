import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarFrameSource } from "@/lib/executar/scanner-engine/frame-source";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("criarFrameSource", () => {
  it("distribui frames capturados para todos os assinantes no intervalo configurado", () => {
    let contador = 0;
    const source = criarFrameSource({
      capturarFrame: () => ({ n: ++contador }),
      intervalMs: 100,
    });
    const recebidosA: number[] = [];
    const recebidosB: number[] = [];
    source.subscribe((frame) => recebidosA.push(frame.n));
    source.subscribe((frame) => recebidosB.push(frame.n));

    source.start();
    vi.advanceTimersByTime(350);

    expect(recebidosA).toEqual([1, 2, 3]);
    expect(recebidosB).toEqual([1, 2, 3]);
  });

  it("nunca distribui frames nulos (vídeo ainda sem dado utilizável)", () => {
    const source = criarFrameSource({
      capturarFrame: () => null,
      intervalMs: 50,
    });
    const listener = vi.fn();
    source.subscribe(listener);

    source.start();
    vi.advanceTimersByTime(500);

    expect(listener).not.toHaveBeenCalled();
  });

  it("stop() interrompe a distribuição e start() é idempotente", () => {
    let contador = 0;
    const source = criarFrameSource({
      capturarFrame: () => ++contador,
      intervalMs: 100,
    });
    const listener = vi.fn();
    source.subscribe(listener);

    source.start();
    source.start(); // segunda chamada não deve abrir um segundo temporizador
    vi.advanceTimersByTime(100);
    expect(listener).toHaveBeenCalledTimes(1);

    source.stop();
    vi.advanceTimersByTime(300);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("isRunning reflete o estado do temporizador", () => {
    const source = criarFrameSource({ capturarFrame: () => 1, intervalMs: 10 });
    expect(source.isRunning).toBe(false);
    source.start();
    expect(source.isRunning).toBe(true);
    source.stop();
    expect(source.isRunning).toBe(false);
  });

  it("unsubscribe remove só o listener correspondente", () => {
    const source = criarFrameSource({ capturarFrame: () => 1, intervalMs: 10 });
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    const unsubscribeA = source.subscribe(listenerA);
    source.subscribe(listenerB);

    source.start();
    vi.advanceTimersByTime(10);
    unsubscribeA();
    vi.advanceTimersByTime(10);

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(2);
  });
});
