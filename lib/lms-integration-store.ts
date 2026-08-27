/**
 * Institutional LMS integration status — Req 15b.4/15b.5, design §21a.
 *
 * Redis-backed from the start (never in-memory). Credentials are stored server-side
 * only; API responses expose masks, never full secrets.
 *
 * Standing rules:
 * - 15b.5: structured credential entry only — no plain-language AI assist anywhere
 *   in this flow (same permanent carve-out as 15c.3 billing plan changes).
 * - MVP scope is 36.1/36.2 only (read roster, assignments/due dates; write grades).
 *   36.4/36.5 content posting is Phase 2/3 and must not appear as options here.
 */

import { getPrimaryAdmin } from "@/lib/demo-data/staff";
import { getRedis } from "@/lib/rate-limit";

export type LmsType = "canvas" | "moodle" | "google_classroom";

export type LmsIntegrationStatus = "not_configured" | "authorized" | "error";

/** Phase 1 (MVP) capabilities only — Req 36.1/36.2. */
export interface LmsMvpCapabilities {
  readRoster: boolean;
  readAssignmentsAndDueDates: boolean;
  writeGrades: boolean;
}

export const LMS_MVP_CAPABILITIES: LmsMvpCapabilities = {
  readRoster: true,
  readAssignmentsAndDueDates: true,
  writeGrades: true,
};

export interface LmsIntegrationPublic {
  lmsType: LmsType;
  label: string;
  status: LmsIntegrationStatus;
  instanceUrl: string | null;
  credentialsMask: string | null;
  authorizedBy: string | null;
  authorizedAt: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  capabilities: LmsMvpCapabilities;
  /** Moodle only — which web-service functions the school enabled. */
  enabledFunctions: string[];
}

export interface LmsIntegrationStatusPayload {
  scopeLabel: string;
  computedAt: string;
  integrations: LmsIntegrationPublic[];
  mvpScopeLabel: string;
  phaseNote: string;
}

interface LmsIntegrationStored {
  lmsType: LmsType;
  status: LmsIntegrationStatus;
  instanceUrl: string | null;
  /** Demo persistence — production encrypts at rest (design §21a). */
  developerKey?: string | null;
  wsToken?: string | null;
  enabledFunctions?: string[];
  authorizedBy: string | null;
  authorizedAt: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

export const LMS_INTEGRATIONS_KEY = "escolent:lms:integrations";

const LMS_LABELS: Record<LmsType, string> = {
  canvas: "Canvas",
  moodle: "Moodle",
  google_classroom: "Google Classroom",
};

const MOODLE_MVP_FUNCTIONS = [
  "core_enrol_get_enrolled_users",
  "mod_assign_get_assignments",
  "gradereport_user_get_grade_items",
] as const;

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "••••";
  return `••••••••${trimmed.slice(-4)}`;
}

function seedIntegrations(): LmsIntegrationStored[] {
  const adminId = getPrimaryAdmin().id;
  return [
    {
      lmsType: "canvas",
      status: "authorized",
      instanceUrl: "https://teneo.instructure.com",
      developerKey: "demo-canvas-key-4782",
      authorizedBy: adminId,
      authorizedAt: daysAgo(45),
      lastSyncAt: hoursAgo(2),
      lastSyncError: null,
    },
    {
      lmsType: "moodle",
      status: "not_configured",
      instanceUrl: null,
      wsToken: null,
      enabledFunctions: [],
      authorizedBy: null,
      authorizedAt: null,
      lastSyncAt: null,
      lastSyncError: null,
    },
    {
      lmsType: "google_classroom",
      status: "not_configured",
      instanceUrl: null,
      authorizedBy: null,
      authorizedAt: null,
      lastSyncAt: null,
      lastSyncError: null,
    },
  ];
}

function normalizeStored(raw: unknown): LmsIntegrationStored | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<LmsIntegrationStored>;
  if (
    entry.lmsType !== "canvas" &&
    entry.lmsType !== "moodle" &&
    entry.lmsType !== "google_classroom"
  ) {
    return null;
  }
  if (
    entry.status !== "not_configured" &&
    entry.status !== "authorized" &&
    entry.status !== "error"
  ) {
    return null;
  }
  return {
    lmsType: entry.lmsType,
    status: entry.status,
    instanceUrl: typeof entry.instanceUrl === "string" ? entry.instanceUrl : null,
    developerKey: typeof entry.developerKey === "string" ? entry.developerKey : null,
    wsToken: typeof entry.wsToken === "string" ? entry.wsToken : null,
    enabledFunctions: Array.isArray(entry.enabledFunctions)
      ? entry.enabledFunctions.filter((fn): fn is string => typeof fn === "string")
      : [],
    authorizedBy: typeof entry.authorizedBy === "string" ? entry.authorizedBy : null,
    authorizedAt: typeof entry.authorizedAt === "string" ? entry.authorizedAt : null,
    lastSyncAt: typeof entry.lastSyncAt === "string" ? entry.lastSyncAt : null,
    lastSyncError: typeof entry.lastSyncError === "string" ? entry.lastSyncError : null,
  };
}

function toPublic(entry: LmsIntegrationStored): LmsIntegrationPublic {
  const credentialsMask =
    entry.lmsType === "canvas" && entry.developerKey
      ? maskSecret(entry.developerKey)
      : entry.lmsType === "moodle" && entry.wsToken
        ? maskSecret(entry.wsToken)
        : null;

  return {
    lmsType: entry.lmsType,
    label: LMS_LABELS[entry.lmsType],
    status: entry.status,
    instanceUrl: entry.instanceUrl,
    credentialsMask,
    authorizedBy: entry.authorizedBy,
    authorizedAt: entry.authorizedAt,
    lastSyncAt: entry.lastSyncAt,
    lastSyncError: entry.lastSyncError,
    capabilities: { ...LMS_MVP_CAPABILITIES },
    enabledFunctions: entry.enabledFunctions ?? [],
  };
}

async function readStoredIntegrations(): Promise<LmsIntegrationStored[]> {
  const redis = getRedis();
  if (!redis) return seedIntegrations();

  try {
    const raw = await redis.get<string | LmsIntegrationStored[]>(LMS_INTEGRATIONS_KEY);
    if (raw == null) return seedIntegrations();
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    if (!Array.isArray(parsed)) return seedIntegrations();
    const normalized = parsed
      .map((entry) => normalizeStored(entry))
      .filter((entry): entry is LmsIntegrationStored => Boolean(entry));
    return normalized.length === 3 ? normalized : seedIntegrations();
  } catch (error) {
    console.error("[lms-integration-store] failed to read integrations", error);
    return seedIntegrations();
  }
}

async function writeStoredIntegrations(entries: LmsIntegrationStored[]): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.set(LMS_INTEGRATIONS_KEY, JSON.stringify(entries));
    return true;
  } catch (error) {
    console.error("[lms-integration-store] failed to write integrations", error);
    return false;
  }
}

/** Seed Canvas as already connected — matches live Canvas rows elsewhere in the demo. */
export async function seedLmsIntegrationsIfEmpty(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const existing = await redis.get(LMS_INTEGRATIONS_KEY);
    if (existing != null) return;
    await redis.set(LMS_INTEGRATIONS_KEY, JSON.stringify(seedIntegrations()));
    console.info("[lms-integration-store] seeded LMS integration records");
  } catch (error) {
    console.error("[lms-integration-store] failed to seed integrations", error);
  }
}

export async function getLmsIntegrationStatus(): Promise<LmsIntegrationStatusPayload> {
  await seedLmsIntegrationsIfEmpty();
  const stored = await readStoredIntegrations();
  const order: LmsType[] = ["canvas", "moodle", "google_classroom"];
  const byType = new Map(stored.map((entry) => [entry.lmsType, entry]));

  return {
    scopeLabel: "Teneo · institutional LMS connections",
    computedAt: new Date().toISOString(),
    integrations: order.map((type) => toPublic(byType.get(type) ?? seedIntegrations().find((e) => e.lmsType === type)!)),
    mvpScopeLabel: "Read roster, assignments, and due dates · write grades back",
    phaseNote:
      "Posting content back to the LMS (Req 36.4/36.5) is Phase 2/3 — not available in this setup flow.",
  };
}

export type AuthorizeLmsInput =
  | {
      lmsType: "canvas";
      instanceUrl: string;
      developerKey: string;
    }
  | {
      lmsType: "moodle";
      instanceUrl: string;
      wsToken: string;
      enabledFunctions: string[];
    };

export type AuthorizeLmsResult =
  | { ok: true; integration: LmsIntegrationPublic }
  | { ok: false; error: string; status: number };

export async function authorizeLmsIntegration(
  input: AuthorizeLmsInput,
): Promise<AuthorizeLmsResult> {
  await seedLmsIntegrationsIfEmpty();
  const stored = await readStoredIntegrations();
  const index = stored.findIndex((entry) => entry.lmsType === input.lmsType);
  if (index < 0) {
    return { ok: false, error: "Unknown LMS type.", status: 400 };
  }

  const now = new Date().toISOString();
  const adminId = getPrimaryAdmin().id;

  if (input.lmsType === "canvas") {
    if (!input.instanceUrl.trim()) {
      return { ok: false, error: "Canvas instance URL is required.", status: 400 };
    }
    const nextKey =
      input.developerKey.trim() || stored[index].developerKey?.trim() || "";
    if (!nextKey) {
      return { ok: false, error: "Canvas developer key is required.", status: 400 };
    }
    stored[index] = {
      ...stored[index],
      status: "authorized",
      instanceUrl: input.instanceUrl.trim(),
      developerKey: nextKey,
      authorizedBy: adminId,
      authorizedAt: now,
      lastSyncAt: now,
      lastSyncError: null,
    };
  } else {
    if (!input.instanceUrl.trim() || !input.wsToken.trim()) {
      return {
        ok: false,
        error: "Moodle site URL and web-service token are required.",
        status: 400,
      };
    }
    const enabled = input.enabledFunctions.filter((fn) =>
      (MOODLE_MVP_FUNCTIONS as readonly string[]).includes(fn),
    );
    if (enabled.length === 0) {
      return {
        ok: false,
        error: "Select at least one MVP web-service function.",
        status: 400,
      };
    }
    stored[index] = {
      ...stored[index],
      status: "authorized",
      instanceUrl: input.instanceUrl.trim(),
      wsToken: input.wsToken.trim(),
      enabledFunctions: enabled,
      authorizedBy: adminId,
      authorizedAt: now,
      lastSyncAt: now,
      lastSyncError: null,
    };
  }

  const saved = await writeStoredIntegrations(stored);
  if (!saved) {
    return {
      ok: false,
      error: "Could not save the connection — Redis is unavailable in this environment.",
      status: 503,
    };
  }

  return { ok: true, integration: toPublic(stored[index]) };
}

export async function getCanvasIntegrationSummary(): Promise<string | null> {
  const status = await getLmsIntegrationStatus();
  const canvas = status.integrations.find((entry) => entry.lmsType === "canvas");
  if (!canvas || canvas.status !== "authorized") return null;
  return `${canvas.label} connected — due dates on Student and Teacher Today come from this integration.`;
}

export { MOODLE_MVP_FUNCTIONS };
