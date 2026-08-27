import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Upstash is used for rate-limit counters, escalation records, and mastery
 * overrides. It is not the application database — there isn't one this phase,
 * by decision.
 */
let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export function isRedisConfigured(): boolean {
  return getRedis() !== null;
}

let aiLimiter: Ratelimit | null = null;

/** Ordinary AI traffic: hints, Lens content, rubric grading, ask boxes. */
function getAiLimiter(): Ratelimit | null {
  if (aiLimiter) return aiLimiter;
  const client = getRedis();
  if (!client) return null;
  aiLimiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(20, "60 s"),
    prefix: "escolent:ai",
    analytics: false,
  });
  return aiLimiter;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export interface LimitResult {
  ok: boolean;
  /** True when the limiter itself could not run, as opposed to a real denial. */
  unavailable?: boolean;
  retryAfterSeconds?: number;
}

export async function checkAiRateLimit(ip: string): Promise<LimitResult> {
  const limiter = getAiLimiter();
  if (!limiter) return { ok: false, unavailable: true };

  try {
    const { success, reset } = await limiter.limit(ip);
    if (success) return { ok: true };
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error("[rate-limit] limiter failed", error);
    return { ok: false, unavailable: true };
  }
}

/**
 * Distress classification is never rate limited — see /api/distress. This is a
 * spend valve, not a gate: past the threshold the endpoint stops paying for
 * classification and routes straight to the fail-open path, which records and
 * responds exactly as a positive detection would. The student's path is
 * identical either way; only the model spend changes.
 */
const DISTRESS_CLASSIFY_BUDGET = 40;
const DISTRESS_BUDGET_WINDOW_SECONDS = 3600;

export async function shouldClassifyDistress(ip: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return true;

  try {
    const key = `escolent:distress-budget:${ip}`;
    const used = await client.incr(key);
    if (used === 1) {
      await client.expire(key, DISTRESS_BUDGET_WINDOW_SECONDS);
    }
    return used <= DISTRESS_CLASSIFY_BUDGET;
  } catch (error) {
    console.error("[distress-budget] check failed", error);
    return true;
  }
}
