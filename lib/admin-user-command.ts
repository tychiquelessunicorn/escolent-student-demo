/**
 * Resolve plain-language admin user commands — Req 14a.1 / 14a.2.
 */

import { MODEL_DEFAULT, complete } from "@/lib/ai/models";
import {
  ADMIN_USER_COMMAND_SYSTEM,
  adminUserCommandPrompt,
  sanitizeAiText,
} from "@/lib/ai/prompts";
import {
  listStaffAccountRecords,
  resolveStaffByName,
  rosterLinesForPrompt,
  type StaffAccountRecord,
} from "@/lib/admin-users-store";
import { parseDeletionIntent } from "@/lib/deletion-intent";
import type { StaffRole } from "@/lib/demo-data/staff";

export type AdminUserCommandKind =
  | "deletion_redirect"
  | "invite_draft"
  | "role_change_draft"
  | "deactivate_draft"
  | "clarify"
  | "unrecognized";

export interface AdminUserInviteDraft {
  fullName: string;
  email: string;
  role: StaffRole;
  gradeLabel: string | null;
}

export interface AdminUserRoleChangeDraft {
  userId: string;
  fullName: string;
  currentRole: StaffRole;
  newRole: StaffRole;
}

export interface AdminUserDeactivateDraft {
  userId: string;
  fullName: string;
}

export interface AdminUserCommandResult {
  kind: AdminUserCommandKind;
  message: string;
  deletionRoute?: "/admin/data-requests";
  matchedStudentName?: string | null;
  inviteDraft?: AdminUserInviteDraft;
  roleChangeDraft?: AdminUserRoleChangeDraft;
  deactivateDraft?: AdminUserDeactivateDraft;
}

type ParsedCommand = {
  action?: string;
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
  newRole?: string | null;
  gradeLabel?: string | null;
  clarificationNeeded?: string | null;
};

function readRole(value: string | null | undefined): StaffRole | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower === "teacher") return "teacher";
  if (lower === "admin") return "admin";
  return null;
}

function parseCommandJson(raw: string): ParsedCommand | null {
  const cleaned = raw
    .trim()
    .replace(/^```(json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as ParsedCommand;
  } catch {
    return null;
  }
}

function clarify(message: string): AdminUserCommandResult {
  return { kind: "clarify", message };
}

function resolveTarget(
  name: string | null | undefined,
  accounts: StaffAccountRecord[],
): StaffAccountRecord[] | AdminUserCommandResult {
  if (!name?.trim()) {
    return clarify("Which person did you mean? Name them so I can find the right account.");
  }
  const matches = resolveStaffByName(name, accounts);
  if (matches.length === 0) {
    return clarify(
      `I couldn't find anyone named "${name.trim()}" on the roster — check the spelling or use the form below.`,
    );
  }
  if (matches.length > 1) {
    return clarify(
      `"${name.trim()}" matches more than one person (${matches.map((m) => m.fullName).join(", ")}) — be more specific.`,
    );
  }
  return matches;
}

export async function resolveAdminUserCommand(text: string): Promise<AdminUserCommandResult> {
  const normalized = text.trim();
  if (!normalized) {
    return { kind: "unrecognized", message: "Say what you need — an invite, role change, or deactivation." };
  }

  const deletion = parseDeletionIntent(normalized);
  if (deletion.isDeletionIntent) {
    return {
      kind: "deletion_redirect",
      message:
        "That reads like a request to delete a person's data, not manage their role or access — use the data deletion flow instead. I won't run it as a role-management action.",
      deletionRoute: "/admin/data-requests",
      matchedStudentName: deletion.matchedStudentName,
    };
  }

  const accounts = await listStaffAccountRecords();
  const rosterLines = rosterLinesForPrompt(accounts);

  const raw = await complete({
    model: MODEL_DEFAULT,
    system: ADMIN_USER_COMMAND_SYSTEM,
    prompt: adminUserCommandPrompt(normalized, rosterLines),
    maxTokens: 350,
  });

  const parsed = parseCommandJson(sanitizeAiText(raw));
  if (!parsed?.action) {
    return {
      kind: "unrecognized",
      message:
        "Couldn't tell what that was asking for — try phrasing it as an invite, or use the form below.",
    };
  }

  if (parsed.clarificationNeeded?.trim()) {
    return clarify(parsed.clarificationNeeded.trim());
  }

  if (parsed.action === "unclear") {
    return clarify(
      "I need a clearer request — who should be invited, and with what role and email?",
    );
  }

  if (parsed.action === "invite") {
    const fullName = parsed.fullName?.trim() ?? "";
    const email = parsed.email?.trim().toLowerCase() ?? "";
    const role = readRole(parsed.role) ?? "teacher";
    if (!fullName) {
      return clarify("Who should be invited? Include their full name.");
    }
    if (!email) {
      return clarify(`What email should the invite go to for ${fullName}?`);
    }
    return {
      kind: "invite_draft",
      message: "Recognized this as an invite — review the form below and send when it looks right.",
      inviteDraft: {
        fullName,
        email,
        role,
        gradeLabel: parsed.gradeLabel?.trim() || null,
      },
    };
  }

  if (parsed.action === "role_change") {
    const resolved = resolveTarget(parsed.fullName, accounts);
    if (!Array.isArray(resolved)) return resolved;
    const target = resolved[0];
    if (target.status !== "active") {
      return clarify(`Only active accounts can change role — ${target.fullName} is ${target.status}.`);
    }
    const newRole = readRole(parsed.newRole);
    if (!newRole) {
      return clarify(
        `Should ${target.fullName} become a Teacher or an Admin? Say which role you want.`,
      );
    }
    if (target.role === newRole) {
      return clarify(`${target.fullName} is already a ${newRole === "teacher" ? "Teacher" : "Admin"}.`);
    }
    return {
      kind: "role_change_draft",
      message: `That looks like a role change for ${target.fullName} — review below and confirm.`,
      roleChangeDraft: {
        userId: target.id,
        fullName: target.fullName,
        currentRole: target.role,
        newRole,
      },
    };
  }

  if (parsed.action === "deactivate") {
    const resolved = resolveTarget(parsed.fullName, accounts);
    if (!Array.isArray(resolved)) return resolved;
    const target = resolved[0];
    if (target.status !== "active") {
      return clarify(`${target.fullName} is not an active login — nothing to deactivate.`);
    }
    return {
      kind: "deactivate_draft",
      message: `That looks like deactivating ${target.fullName}'s access — review below and confirm.`,
      deactivateDraft: {
        userId: target.id,
        fullName: target.fullName,
      },
    };
  }

  return {
    kind: "unrecognized",
    message:
      "Couldn't tell what that was asking for — try phrasing it as an invite, or use the form below.",
  };
}
