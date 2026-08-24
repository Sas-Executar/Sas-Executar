import { Ratelimit, type RatelimitConfig } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { keys } from "./keys";

const configuration = keys();

export const redis =
  configuration.UPSTASH_REDIS_REST_URL &&
  configuration.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: configuration.UPSTASH_REDIS_REST_URL,
        token: configuration.UPSTASH_REDIS_REST_TOKEN,
      })
    : undefined;

export const createRateLimiter = (props: Omit<RatelimitConfig, "redis">) => {
  if (!redis) {
    throw new Error("Rate limit distribuído ainda não foi configurado.");
  }

  return new Ratelimit({
    redis,
    limiter: props.limiter ?? Ratelimit.slidingWindow(10, "10 s"),
    prefix: props.prefix ?? "next-forge",
  });
};

interface LocalWindow {
  count: number;
  resetAt: number;
}

interface OperationalLimitInput {
  readonly identifier: string;
  readonly limit?: number;
  readonly namespace: string;
  readonly now?: number;
  readonly window?: `${number} s` | `${number} m` | `${number} h`;
  readonly windowMs?: number;
}

export interface OperationalLimitResult {
  readonly distributed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly reset: number;
  readonly success: boolean;
}

const globalWindows = globalThis as typeof globalThis & {
  __executarRateLimitWindows?: Map<string, LocalWindow>;
};
const localWindows =
  globalWindows.__executarRateLimitWindows ?? new Map<string, LocalWindow>();

globalWindows.__executarRateLimitWindows = localWindows;

/**
 * Limite distribuído quando Upstash está configurado e fallback fechado por
 * instância para desenvolvimento/Preview. O gate de produção continua exigindo
 * o provedor distribuído como evidência real.
 */
export async function limitOperationalMutation({
  identifier,
  namespace,
  limit = 30,
  window = "1 m",
  windowMs = 60_000,
  now = Date.now(),
}: OperationalLimitInput): Promise<OperationalLimitResult> {
  if (!(identifier.trim() && namespace.trim())) {
    throw new Error("O limite operacional exige identidade e namespace.");
  }

  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("O limite operacional precisa ser um inteiro positivo.");
  }

  if (redis) {
    const limiter = createRateLimiter({
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `executar:${namespace}`,
    });
    const result = await limiter.limit(identifier);

    return {
      distributed: true,
      limit,
      remaining: result.remaining,
      reset: result.reset,
      success: result.success,
    };
  }

  const key = `${namespace}:${identifier}`;
  const existing = localWindows.get(key);
  const current =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing;
  current.count += 1;
  localWindows.set(key, current);

  return {
    distributed: false,
    limit,
    remaining: Math.max(0, limit - current.count),
    reset: current.resetAt,
    success: current.count <= limit,
  };
}

export const { slidingWindow } = Ratelimit;
