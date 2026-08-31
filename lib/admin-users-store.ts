/**
 * Admin user & role management — Req 14a.
 *
 * Mutable staff state overlays the baseline STAFF seed in demo-data/staff.ts.
 * Redis-backed accounts + audit log; never a parallel roster list.
 */

import { randomUUID } from "crypto";
import { adminBriefingScopeLabel } from "@/lib/admin-briefing-store";
import {
  STAFF,
  getPrimaryAdmin,
  type StaffMember,
  type StaffRole,
} from "@/lib/demo-data/staff";
import { getRedis } from "@/lib/rate-limit";

export type StaffAccountStatus = "active" | "invited" | "deactivated";

export type UserManagementAction = "invite" | "change_role" | "deactivate";

export type UserManagementEntryMethod = "structured" | "conversational";

export interface StaffAccountRecord {
  id: string;
  fullName: string;
  shortName: string;
  email: string;
  role: StaffRole;
  status: StaffAccountStatus;
  gradeLabel: string | null;
  invitedAt: string | null;
  deactivatedAt: string | null;
}

export interface UserManagementAuditEntry {
  id: string;
  action: UserManagementAction;
  targetUserId: string;
  targetName: string;
  targetEmail: string | null;
  previousRole: StaffRole | null;
  newRole: StaffRole | null;
  entryMethod: UserManagementEntryMethod;
  performedBy: string;
  performedAt: string;
  plainLanguageTrigger: string | null;
}

export interface AdminUserPublic {
  id: string;
  fullName: string;
  shortName: string;
  email: string;
  role: StaffRole;
  roleLabel: string;
  status: StaffAccountStatus;
  statusLabel: string;
  gradeLabel: string | null;
  isSelf: boolean;
  canChangeRole: boolean;
  canDeactivate: boolean;
}

export interface AdminUsersPayload {
  scopeLabel: string;
  computedAt: string;
  adminId: string;
  users: AdminUserPublic[];
  recentAudit: UserManagementAuditEntry[];
}

const ACCOUNTS_KEY = "escolent:admin-users:accounts";
const AUDIT_KEY = "escolent:admin-users:audit";
const AUDIT_CAP = 200;

const BASELINE_EMAILS: Record<string, string> = {
  sarah_mokoena: "s.mokoena@teneo.edu",
  david_chen: "d.chen@teneo.edu",
};

const ROLE_LABEL: Record<StaffRole, string> = {
  teacher: "Teacher",
  admin: "Admin",
  pedagogical_lead: "Pedagogical Lead",
};

const STATUS_LABEL: Record<StaffAccountStatus, string> = {
  active: "Active",
  invited: "Invited",
  deactivated: "Deactivated",
};

function titleShortName(fullName: string, role: StaffRole): string {
  const first = fullName.split(/\s+/)[0] ?? fullName;
  const honorific = role === "admin" ? "Mr." : "Ms.";
  return `${honorific} ${first}`;
}

function seedAccounts(): StaffAccountRecord[] {
  return STAFF.map((member) => ({
    id: member.id,
    fullName: member.fullName,
    shortName: member.shortName,
    email: BASELINE_EMAILS[member.id] ?? `${member.id}@teneo.edu`,
    role: member.role,
    status: "active",
    gradeLabel: member.role === "teacher" ? "Grade 8" : null,
    invitedAt: null,
    deactivatedAt: null,
  }));
}

function normalizeAccount(raw: unknown): StaffAccountRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<StaffAccountRecord>;
  if (
    typeof entry.id !== "string" ||
    typeof entry.fullName !== "string" ||
    typeof entry.shortName !== "string" ||
    typeof entry.email !== "string"
  ) {
    return null;
  }
  if (entry.role !== "teacher" && entry.role !== "admin") return null;
  if (
    entry.status !== "active" &&
    entry.status !== "invited" &&
    entry.status !== "deactivated"
  ) {
    return null;
  }
  return {
    id: entry.id,
    fullName: entry.fullName,
    shortName: entry.shortName,
    email: entry.email.trim().toLowerCase(),
    role: entry.role,
    status: entry.status,
    gradeLabel: typeof entry.gradeLabel === "string" ? entry.gradeLabel : null,
    invitedAt: typeof entry.invitedAt === "string" ? entry.invitedAt : null,
    deactivatedAt: typeof entry.deactivatedAt === "string" ? entry.deactivatedAt : null,
  };
}

function normalizeAuditEntry(raw: unknown): UserManagementAuditEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<UserManagementAuditEntry>;
  if (
    typeof entry.id !== "string" ||
    typeof entry.targetUserId !== "string" ||
    typeof entry.targetName !== "string" ||
    typeof entry.performedBy !== "string" ||
    typeof entry.performedAt !== "string"
  ) {
    return null;
  }
  if (
    entry.action !== "invite" &&
    entry.action !== "change_role" &&
    entry.action !== "deactivate"
  ) {
    return null;
  }
  return {
    id: entry.id,
    action: entry.action,
    targetUserId: entry.targetUserId,
    targetName: entry.targetName,
    targetEmail: typeof entry.targetEmail === "string" ? entry.targetEmail : null,
    previousRole:
      entry.previousRole === "teacher" || entry.previousRole === "admin"
        ? entry.previousRole
        : null,
    newRole:
      entry.newRole === "teacher" || entry.newRole === "admin" ? entry.newRole : null,
    entryMethod: entry.entryMethod === "conversational" ? "conversational" : "structured",
    performedBy: entry.performedBy,
    performedAt: entry.performedAt,
    plainLanguageTrigger:
      typeof entry.plainLanguageTrigger === "string" ? entry.plainLanguageTrigger : null,
  };
}

async function readAccounts(): Promise<StaffAccountRecord[]> {
  const redis = getRedis();
  if (!redis) return seedAccounts();
  try {
    const raw = await redis.get<string | StaffAccountRecord[]>(ACCOUNTS_KEY);
    if (raw == null) return seedAccounts();
    const list = typeof raw === "string" ? (JSON.parse(raw) as unknown[]) : raw;
    const normalized = list
      .map((entry) => normalizeAccount(entry))
      .filter((entry): entry is StaffAccountRecord => Boolean(entry));
    return normalized.length > 0 ? normalized : seedAccounts();
  } catch (error) {
    console.error("[admin-users-store] failed to read accounts", error);
    return seedAccounts();
  }
}

async function writeAccounts(accounts: StaffAccountRecord[]): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.set(ACCOUNTS_KEY, JSON.stringify(accounts));
    return true;
  } catch (error) {
    console.error("[admin-users-store] failed to write accounts", error);
    return false;
  }
}

async function seedAccountsIfEmpty(): Promise<StaffAccountRecord[]> {
  const redis = getRedis();
  const seed = seedAccounts();
  if (!redis) return seed;
  try {
    const existing = await redis.get(ACCOUNTS_KEY);
    if (existing != null) return readAccounts();
    await redis.set(ACCOUNTS_KEY, JSON.stringify(seed));
    return seed;
  } catch (error) {
    console.error("[admin-users-store] failed to seed accounts", error);
    return seed;
  }
}

async function readAuditLog(): Promise<UserManagementAuditEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = await redis.get<string | UserManagementAuditEntry[]>(AUDIT_KEY);
    if (raw == null) return [];
    const list = typeof raw === "string" ? (JSON.parse(raw) as unknown[]) : raw;
    return list
      .map((entry) => normalizeAuditEntry(entry))
      .filter((entry): entry is UserManagementAuditEntry => Boolean(entry));
  } catch {
    return [];
  }
}

async function appendAudit(entry: UserManagementAuditEntry): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const existing = await readAuditLog();
  await redis.set(AUDIT_KEY, JSON.stringify([entry, ...existing].slice(0, AUDIT_CAP)));
}

function toPublicUser(account: StaffAccountRecord, adminId: string): AdminUserPublic {
  const isSelf = account.id === adminId;
  return {
    id: account.id,
    fullName: account.fullName,
    shortName: account.shortName,
    email: account.email,
    role: account.role,
    roleLabel: ROLE_LABEL[account.role],
    status: account.status,
    statusLabel: STATUS_LABEL[account.status],
    gradeLabel: account.gradeLabel,
    isSelf,
    canChangeRole: account.status === "active" && !isSelf,
    canDeactivate: account.status === "active" && !isSelf,
  };
}

export async function listStaffAccountRecords(): Promise<StaffAccountRecord[]> {
  return seedAccountsIfEmpty();
}

export async function listAdminUsers(): Promise<AdminUsersPayload> {
  const accounts = await seedAccountsIfEmpty();
  const adminId = getPrimaryAdmin().id;
  const recentAudit = (await readAuditLog()).slice(0, 8);
  return {
    scopeLabel: adminBriefingScopeLabel(),
    computedAt: new Date().toISOString(),
    adminId,
    users: accounts.map((account) => toPublicUser(account, adminId)),
    recentAudit,
  };
}

export async function getStaffAccount(id: string): Promise<StaffAccountRecord | null> {
  const accounts = await seedAccountsIfEmpty();
  return accounts.find((account) => account.id === id) ?? null;
}

export function rosterLinesForPrompt(accounts: StaffAccountRecord[]): string {
  return accounts
    .map(
      (account) =>
        `- ${account.id}: ${account.fullName} (${ROLE_LABEL[account.role]}, ${STATUS_LABEL[account.status]})`,
    )
    .join("\n");
}

export function resolveStaffByName(
  name: string,
  accounts: StaffAccountRecord[],
): StaffAccountRecord[] {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const lower = trimmed.toLowerCase();

  const exact = accounts.filter((account) => account.fullName.toLowerCase() === lower);
  if (exact.length === 1) return exact;
  if (exact.length > 1) return exact;

  const partial = accounts.filter((account) => account.fullName.toLowerCase().includes(lower));
  if (partial.length === 1) return partial;

  const first = trimmed.split(/\s+/)[0]?.toLowerCase();
  if (!first) return partial;
  const byFirst = accounts.filter(
    (account) => account.fullName.split(/\s+/)[0]?.toLowerCase() === first,
  );
  if (byFirst.length === 1) return byFirst;
  if (byFirst.length > 1) return byFirst;

  return partial.length > 0 ? partial : byFirst;
}

function slugIdFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "user";
  return local.replace(/[^a-z0-9]+/gi, "_").toLowerCase().slice(0, 40);
}

export type InviteStaffInput = {
  fullName: string;
  email: string;
  role: StaffRole;
  gradeLabel?: string | null;
  entryMethod?: UserManagementEntryMethod;
  plainLanguageTrigger?: string | null;
};

export type InviteStaffResult =
  | { ok: true; user: AdminUserPublic }
  | { ok: false; error: string; status: number };

export async function inviteStaff(input: InviteStaffInput): Promise<InviteStaffResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!fullName) return { ok: false, error: "Name is required.", status: 400 };
  if (!email || !email.includes("@")) {
    return { ok: false, error: "A valid email is required.", status: 400 };
  }

  const accounts = await seedAccountsIfEmpty();
  if (accounts.some((account) => account.email === email)) {
    return { ok: false, error: "Someone with that email is already on the roster.", status: 409 };
  }

  const now = new Date().toISOString();
  const record: StaffAccountRecord = {
    id: accounts.some((account) => account.id === slugIdFromEmail(email))
      ? `${slugIdFromEmail(email)}_${randomUUID().slice(0, 8)}`
      : slugIdFromEmail(email),
    fullName,
    shortName: titleShortName(fullName, input.role),
    email,
    role: input.role,
    status: "invited",
    gradeLabel: input.gradeLabel?.trim() || null,
    invitedAt: now,
    deactivatedAt: null,
  };

  const saved = await writeAccounts([record, ...accounts]);
  if (!saved) {
    return { ok: false, error: "Could not save the invite — Redis is unavailable.", status: 503 };
  }

  const adminId = getPrimaryAdmin().id;
  await appendAudit({
    id: randomUUID(),
    action: "invite",
    targetUserId: record.id,
    targetName: record.fullName,
    targetEmail: record.email,
    previousRole: null,
    newRole: record.role,
    entryMethod: input.entryMethod ?? "structured",
    performedBy: adminId,
    performedAt: now,
    plainLanguageTrigger: input.plainLanguageTrigger?.trim() || null,
  });

  return { ok: true, user: toPublicUser(record, adminId) };
}

export type ChangeStaffRoleInput = {
  userId: string;
  newRole: StaffRole;
  entryMethod?: UserManagementEntryMethod;
  plainLanguageTrigger?: string | null;
};

export type ChangeStaffRoleResult =
  | { ok: true; user: AdminUserPublic }
  | { ok: false; error: string; status: number };

export async function changeStaffRole(
  input: ChangeStaffRoleInput,
): Promise<ChangeStaffRoleResult> {
  const adminId = getPrimaryAdmin().id;
  if (input.userId === adminId) {
    return { ok: false, error: "You cannot change your own role.", status: 403 };
  }

  const accounts = await seedAccountsIfEmpty();
  const index = accounts.findIndex((account) => account.id === input.userId);
  if (index < 0) return { ok: false, error: "Unknown user.", status: 404 };

  const current = accounts[index];
  if (current.status !== "active") {
    return {
      ok: false,
      error: "Only active accounts can have their role changed.",
      status: 409,
    };
  }
  if (current.role === input.newRole) {
    return { ok: false, error: "That is already their role.", status: 409 };
  }

  const now = new Date().toISOString();
  const next: StaffAccountRecord = {
    ...current,
    role: input.newRole,
    shortName: titleShortName(current.fullName, input.newRole),
  };
  const updated = [...accounts];
  updated[index] = next;

  const saved = await writeAccounts(updated);
  if (!saved) {
    return { ok: false, error: "Could not save the role change — Redis is unavailable.", status: 503 };
  }

  await appendAudit({
    id: randomUUID(),
    action: "change_role",
    targetUserId: next.id,
    targetName: next.fullName,
    targetEmail: next.email,
    previousRole: current.role,
    newRole: next.role,
    entryMethod: input.entryMethod ?? "structured",
    performedBy: adminId,
    performedAt: now,
    plainLanguageTrigger: input.plainLanguageTrigger?.trim() || null,
  });

  return { ok: true, user: toPublicUser(next, adminId) };
}

export type DeactivateStaffInput = {
  userId: string;
  entryMethod?: UserManagementEntryMethod;
  plainLanguageTrigger?: string | null;
};

export type DeactivateStaffResult =
  | { ok: true; user: AdminUserPublic }
  | { ok: false; error: string; status: number };

export async function deactivateStaff(
  input: DeactivateStaffInput,
): Promise<DeactivateStaffResult> {
  const adminId = getPrimaryAdmin().id;
  if (input.userId === adminId) {
    return { ok: false, error: "You cannot deactivate your own account.", status: 403 };
  }

  const accounts = await seedAccountsIfEmpty();
  const index = accounts.findIndex((account) => account.id === input.userId);
  if (index < 0) return { ok: false, error: "Unknown user.", status: 404 };

  const current = accounts[index];
  if (current.status === "deactivated") {
    return { ok: false, error: "This account is already deactivated.", status: 409 };
  }

  const now = new Date().toISOString();
  const next: StaffAccountRecord = {
    ...current,
    status: "deactivated",
    deactivatedAt: now,
  };
  const updated = [...accounts];
  updated[index] = next;

  const saved = await writeAccounts(updated);
  if (!saved) {
    return {
      ok: false,
      error: "Could not save deactivation — Redis is unavailable.",
      status: 503,
    };
  }

  await appendAudit({
    id: randomUUID(),
    action: "deactivate",
    targetUserId: next.id,
    targetName: next.fullName,
    targetEmail: next.email,
    previousRole: current.role,
    newRole: null,
    entryMethod: input.entryMethod ?? "structured",
    performedBy: adminId,
    performedAt: now,
    plainLanguageTrigger: input.plainLanguageTrigger?.trim() || null,
  });

  return { ok: true, user: toPublicUser(next, adminId) };
}

export async function resendInvite(userId: string): Promise<{ ok: boolean; error?: string }> {
  const accounts = await seedAccountsIfEmpty();
  const index = accounts.findIndex((account) => account.id === userId);
  if (index < 0) return { ok: false, error: "Unknown user." };
  if (accounts[index].status !== "invited") {
    return { ok: false, error: "Only invited accounts can be resent." };
  }
  const updated = [...accounts];
  updated[index] = { ...updated[index], invitedAt: new Date().toISOString() };
  await writeAccounts(updated);
  return { ok: true };
}

/** Lines for the command-layer prompt — baseline STAFF ids must stay stable. */
export function baselineStaffIds(): Set<string> {
  return new Set(STAFF.map((member: StaffMember) => member.id));
}
