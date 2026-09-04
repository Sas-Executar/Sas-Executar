import { describe, expect, it, vi } from "vitest";
import {
  confiancaSuficiente,
  iniciarOcrWorker,
  type OcrWorkerLike,
  prepararOcrWorker,
} from "@/lib/executar/scanner-engine/ocr-worker";
import { criarScannerEngine } from "@/lib/executar/scanner-engine/scanner-engine";

function workerFalso(overrides: Partial<OcrWorkerLike> = {}): OcrWorkerLike {
  return {
    recognize: vi.fn().mockResolvedValue({
      data: { confidence: 91, text: "FEITO" },
    }),
    setParameters: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("prepararOcrWorker", () => {
  it("instrumenta a latência do recognize() e repassa confiança/texto", async () => {
    const fake = workerFalso();
    const handle = await prepararOcrWorker(() => Promise.resolve(fake));

    const resultado = await handle.recognize("frame-fake");

    expect(fake.recognize).toHaveBeenCalledWith("frame-fake");
    expect(resultado.confidence).toBe(91);
    expect(resultado.text).toBe("FEITO");
    expect(resultado.recognitionLatencyMs).toBe(
      Math.round(resultado.recognitionEndedAt - resultado.recognitionStartedAt)
    );
    expect(resultado.recognitionEndedAt).toBeGreaterThanOrEqual(
      resultado.recognitionStartedAt
    );
  });

  it("terminate() delega ao worker real", async () => {
    const fake = workerFalso();
    const handle = await prepararOcrWorker(() => Promise.resolve(fake));

    await handle.terminate();
    expect(fake.terminate).toHaveBeenCalledTimes(1);
  });

  it("reutiliza sempre o mesmo worker — nunca cria um novo por reconhecimento", async () => {
    const criarWorkerTesseract = vi.fn().mockResolvedValue(workerFalso());
    const handle = await prepararOcrWorker(criarWorkerTesseract);

    await handle.recognize("a");
    await handle.recognize("b");
    await handle.recognize("c");

    expect(criarWorkerTesseract).toHaveBeenCalledTimes(1);
  });
});

describe("confiancaSuficiente", () => {
  it("usa o mesmo limiar de produção (58)", () => {
    expect(confiancaSuficiente(58)).toBe(true);
    expect(confiancaSuficiente(57.9)).toBe(false);
    expect(confiancaSuficiente(100)).toBe(true);
  });
});

describe("iniciarOcrWorker — integração com o ScannerEngine", () => {
  it("avisa notifyWorkerReady() quando o worker prepara com sucesso", async () => {
    const engine = criarScannerEngine();
    engine.start();

    const handle = await iniciarOcrWorker(engine, () =>
      Promise.resolve(workerFalso())
    );

    expect(handle).not.toBeNull();
    expect(engine.getSnapshot().state).toBe("ready");
  });

  it("avisa notifyWorkerUnavailable() e retorna null quando o worker falha ao preparar", async () => {
    const engine = criarScannerEngine();
    engine.start();

    const handle = await iniciarOcrWorker(engine, () =>
      Promise.reject(new Error("WASM indisponível"))
    );

    expect(handle).toBeNull();
    expect(engine.getSnapshot().state).toBe("unavailable");
    expect(engine.getSnapshot().metrics.workerFailures).toBe(1);
  });
});
