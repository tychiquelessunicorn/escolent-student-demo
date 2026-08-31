"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  AdminUserCommandResult,
  AdminUserDeactivateDraft,
  AdminUserInviteDraft,
  AdminUserRoleChangeDraft,
} from "@/lib/admin-user-command";
import { useAdminTour } from "@/components/admin-tour-provider";
import { isEmbedMode } from "@/lib/embed";
import type { AdminUserPublic, AdminUsersPayload, UserManagementAuditEntry } from "@/lib/admin-users-store";
import type { StaffRole } from "@/lib/demo-data/staff";
import { EscolentLoader } from "@/components/escolent-logo";

interface RecordViewer {
  staffId: string;
  displayName: string;
  viewedAt: string;
}

const ROLE_LABEL: Record<StaffRole, string> = {
  teacher: "Teacher",
  admin: "Admin",
  pedagogical_lead: "Pedagogical Lead",
};

function resultClassName(kind: AdminUserCommandResult["kind"]): string {
  switch (kind) {
    case "invite_draft":
    case "role_change_draft":
    case "deactivate_draft":
      return "esc-admin-users-result-draft";
    case "deletion_redirect":
      return "esc-admin-users-result-refusal";
    case "clarify":
      return "esc-admin-users-result-clarify";
    default:
      return "esc-admin-users-result-error";
  }
}

function AuditLine({ entry }: { entry: UserManagementAuditEntry }) {
  const actionLabel =
    entry.action === "invite"
      ? "Invited"
      : entry.action === "change_role"
        ? "Role changed"
        : "Deactivated";
  const detail =
    entry.action === "change_role" && entry.previousRole && entry.newRole
      ? `${ROLE_LABEL[entry.previousRole]} → ${ROLE_LABEL[entry.newRole]}`
      : entry.newRole
        ? ROLE_LABEL[entry.newRole]
        : "";
  return (
    <li>
      {actionLabel} {entry.targetName}
      {detail ? ` · ${detail}` : ""} ·{" "}
      {entry.entryMethod === "conversational" ? "via command" : "structured"}
    </li>
  );
}

function AdminUsersInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { stage } = useAdminTour();
  const isEmbed = isEmbedMode(searchParams);
  const demoMode = !isEmbed && searchParams.get("demo") === "1";
  const focusedId = searchParams.get("user") ?? null;

  const tourDeletionIntent = stage?.showDeletionIntentDemo ?? false;
  const tourRoleReview = stage?.showRoleChangeReviewDemo ?? false;
  const tourDeletionResult: AdminUserCommandResult | null = tourDeletionIntent
    ? {
        kind: "deletion_redirect",
        message:
          "That reads like a request to delete a person's data, not manage their role or access — use the data deletion flow instead. I won't run it as a role-management action.",
        deletionRoute: "/admin/data-requests",
        matchedStudentName: "Mia Ndlovu",
      }
    : null;
  const tourRoleDraft = tourRoleReview ? (stage?.roleChangeDraft ?? null) : null;
  const tourCmdText = tourDeletionIntent
    ? (stage?.deletionIntentText ?? "")
    : tourRoleReview
      ? "make Sarah Mokoena an admin for the school"
      : null;
  const commandReadOnly = tourDeletionIntent || tourRoleReview;

  const [payload, setPayload] = useState<AdminUsersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otherViewers, setOtherViewers] = useState<Record<string, RecordViewer[]>>({});

  const [cmdText, setCmdText] = useState("");
  const [cmdLoading, setCmdLoading] = useState(false);
  const [cmdResult, setCmdResult] = useState<AdminUserCommandResult | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<StaffRole>("teacher");
  const [formGrade, setFormGrade] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [roleDraft, setRoleDraft] = useState<AdminUserRoleChangeDraft | null>(null);
  const [deactivateDraft, setDeactivateDraft] = useState<AdminUserDeactivateDraft | null>(null);
  const [pendingPlainLanguage, setPendingPlainLanguage] = useState<string | null>(null);

  const displayCmdText = tourCmdText ?? cmdText;
  const displayCmdResult = tourDeletionResult ?? cmdResult;
  const displayRoleDraft = tourRoleDraft ?? roleDraft;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("load failed");
      setPayload((await response.json()) as AdminUsersPayload);
    } catch {
      setError("Could not load users right now.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const focusUser = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("user", id);
      else params.delete("user");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (tourRoleReview && stage?.roleChangeDraft) {
      focusUser(stage.roleChangeDraft.userId);
    }
  }, [focusUser, stage?.roleChangeDraft, tourRoleReview]);

  useEffect(() => {
    if (!focusedId) return;
    const userId = focusedId;
    let cancelled = false;

    async function openUser() {
      try {
        await fetch(`/api/admin/users/${userId}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) return;
        const data = (await response.json()) as { otherViewers: RecordViewer[] };
        if (cancelled) return;
        setOtherViewers((current) => ({ ...current, [userId]: data.otherViewers }));
      } catch {
        if (!cancelled) setOtherViewers((current) => ({ ...current, [userId]: [] }));
      }
    }

    void openUser();
    return () => {
      cancelled = true;
    };
  }, [focusedId]);

  const applyInviteDraft = (draft: AdminUserInviteDraft, plainLanguage: string | null) => {
    setFormOpen(true);
    setFormName(draft.fullName);
    setFormEmail(draft.email);
    setFormRole(draft.role);
    setFormGrade(draft.gradeLabel ?? "");
    setPendingPlainLanguage(plainLanguage);
    setFormError(null);
  };

  const runCommand = async () => {
    const trimmed = cmdText.trim();
    if (!trimmed || cmdLoading) return;
    setCmdLoading(true);
    setCmdResult(null);
    setRoleDraft(null);
    setDeactivateDraft(null);
    try {
      const response = await fetch("/api/admin/users/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = (await response.json()) as AdminUserCommandResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Command failed.");
      setCmdResult(data);
      if (data.kind === "invite_draft" && data.inviteDraft) {
        applyInviteDraft(data.inviteDraft, trimmed);
      }
      if (data.kind === "role_change_draft" && data.roleChangeDraft) {
        setRoleDraft(data.roleChangeDraft);
        setPendingPlainLanguage(trimmed);
        focusUser(data.roleChangeDraft.userId);
      }
      if (data.kind === "deactivate_draft" && data.deactivateDraft) {
        setDeactivateDraft(data.deactivateDraft);
        setPendingPlainLanguage(trimmed);
        focusUser(data.deactivateDraft.userId);
      }
    } catch (err) {
      setCmdResult({
        kind: "unrecognized",
        message: err instanceof Error ? err.message : "Couldn't process that right now.",
      });
    } finally {
      setCmdLoading(false);
    }
  };

  const submitInvite = async () => {
    setFormSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formName,
          email: formEmail,
          role: formRole,
          gradeLabel: formGrade.trim() || null,
          entryMethod: pendingPlainLanguage ? "conversational" : "structured",
          plainLanguageTrigger: pendingPlainLanguage,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not send invite.");
      setToast(`Invite sent to ${formEmail.trim()}.`);
      setFormOpen(false);
      setFormName("");
      setFormEmail("");
      setFormRole("teacher");
      setFormGrade("");
      setPendingPlainLanguage(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not send invite.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const confirmRoleChange = async () => {
    if (!roleDraft || tourRoleReview) return;
    try {
      const response = await fetch(`/api/admin/users/${roleDraft.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newRole: roleDraft.newRole,
          entryMethod: pendingPlainLanguage ? "conversational" : "structured",
          plainLanguageTrigger: pendingPlainLanguage,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not change role.");
      setToast(`${roleDraft.fullName} is now ${ROLE_LABEL[roleDraft.newRole]}.`);
      setRoleDraft(null);
      setPendingPlainLanguage(null);
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not change role.");
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateDraft) return;
    try {
      const response = await fetch(`/api/admin/users/${deactivateDraft.userId}/deactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryMethod: pendingPlainLanguage ? "conversational" : "structured",
          plainLanguageTrigger: pendingPlainLanguage,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not deactivate.");
      setToast(`${deactivateDraft.fullName}'s login was deactivated.`);
      setDeactivateDraft(null);
      setPendingPlainLanguage(null);
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not deactivate.");
    }
  };

  const changeRoleStructured = async (user: AdminUserPublic, newRole: StaffRole) => {
    if (user.role === newRole) return;
    setRoleDraft({
      userId: user.id,
      fullName: user.fullName,
      currentRole: user.role,
      newRole,
    });
    setPendingPlainLanguage(null);
    focusUser(user.id);
  };

  const resendInvite = async (userId: string, email: string) => {
    const response = await fetch(`/api/admin/users/${userId}/resend-invite`, { method: "POST" });
    if (response.ok) setToast(`Invite resent to ${email}.`);
  };

  const simulatePeerViewer = async () => {
    if (!focusedId) return;
    const response = await fetch(`/api/admin/users/${focusedId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demoPeer: true }),
    });
    if (response.ok) {
      const data = (await response.json()) as { otherViewers: RecordViewer[] };
      setOtherViewers((current) => ({ ...current, [focusedId]: data.otherViewers }));
    }
  };

  return (
    <div className="esc-screen esc-admin-users-screen">
      <header style={{ marginBottom: 24 }}>
        <Link href="/admin/briefing" className="esc-spaces-back">
          ← Briefing
        </Link>
        <h1 className="esc-staff-foundation-title" style={{ marginTop: 12, marginBottom: 6 }}>
          Users &amp; roles
        </h1>
        <p className="esc-staff-body" style={{ margin: 0 }}>
          {payload?.scopeLabel ?? "Teneo · school-wide"} — who has access, and what they can do
          with it.
        </p>
      </header>

      {demoMode ? (
        <section className="esc-staff-panel esc-admin-data-demo" style={{ marginBottom: 24 }}>
          <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
            Demo harness
          </p>
          <button
            type="button"
            className="esc-staff-btn esc-staff-btn-secondary"
            disabled={!focusedId}
            onClick={() => void simulatePeerViewer()}
          >
            Simulate another admin viewing this record
          </button>
        </section>
      ) : null}

      <section className="esc-staff-panel esc-admin-users-command" style={{ marginBottom: 24 }} data-tour="admin-users-command">
        <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
          Plain-language command
        </p>
        <div className="esc-mastery-ask-field">
          <input
            type="text"
            className="esc-mastery-ask-input"
            placeholder='e.g. "invite Jane Smith as a teacher, jane@teneo.edu"'
            value={displayCmdText}
            readOnly={commandReadOnly}
            onChange={(event) => setCmdText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void runCommand();
            }}
          />
          {displayCmdText.trim() && !commandReadOnly ? (
            <button type="button" className="esc-staff-btn esc-staff-btn-primary" onClick={() => void runCommand()}>
              Run
            </button>
          ) : null}
        </div>
        {cmdLoading ? <p className="esc-mastery-ask-status">Reading that…</p> : null}
        {displayCmdResult ? (
          <div className={["esc-admin-users-result", resultClassName(displayCmdResult.kind)].join(" ")}>
            <p style={{ margin: 0 }}>{displayCmdResult.message}</p>
            {displayCmdResult.kind === "deletion_redirect" ? (
              <Link href="/admin/data-requests" className="esc-admin-users-deletion-link">
                Open data deletion flow →
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="esc-admin-users-toolbar">
        <p className="esc-staff-section-label" style={{ margin: 0 }}>
          People
        </p>
        <button
          type="button"
          className="esc-staff-btn esc-staff-btn-primary"
          onClick={() => {
            setFormOpen((open) => !open);
            setFormError(null);
          }}
        >
          {formOpen ? "Close" : "+ Invite someone"}
        </button>
      </div>

      {formOpen ? (
        <section className="esc-staff-panel esc-admin-users-form" style={{ marginBottom: 16 }}>
          <div className="esc-admin-users-form-grid">
            <label className="esc-admin-billing-field">
              <span className="esc-staff-section-label">Name</span>
              <input
                type="text"
                className="esc-mastery-ask-input"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                placeholder="Jane Smith"
              />
            </label>
            <label className="esc-admin-billing-field">
              <span className="esc-staff-section-label">Email</span>
              <input
                type="email"
                className="esc-mastery-ask-input"
                value={formEmail}
                onChange={(event) => setFormEmail(event.target.value)}
                placeholder="jane@teneo.edu"
              />
            </label>
            <label className="esc-admin-billing-field">
              <span className="esc-staff-section-label">Role</span>
              <select
                className="esc-mastery-filter-select"
                value={formRole}
                onChange={(event) => setFormRole(event.target.value as StaffRole)}
              >
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="esc-admin-billing-field">
              <span className="esc-staff-section-label">Grade (optional)</span>
              <input
                type="text"
                className="esc-mastery-ask-input"
                value={formGrade}
                onChange={(event) => setFormGrade(event.target.value)}
                placeholder="Grade 8"
              />
            </label>
          </div>
          <div className="esc-admin-billing-change-actions">
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-primary"
              disabled={formSubmitting || !formName.trim() || !formEmail.trim()}
              onClick={() => void submitInvite()}
            >
              {formSubmitting ? "Sending…" : "Send invite"}
            </button>
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-secondary"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </button>
          </div>
          {formError ? <p className="esc-mastery-ask-error">{formError}</p> : null}
        </section>
      ) : null}

      {displayRoleDraft ? (
        <section
          className="esc-staff-panel esc-admin-users-review"
          style={{ marginBottom: 16 }}
          data-tour="admin-users-role-review"
        >
          <h2 className="esc-admin-billing-panel-title">Confirm role change</h2>
          <p className="esc-staff-body">
            {displayRoleDraft.fullName}: {ROLE_LABEL[displayRoleDraft.currentRole]} →{" "}
            {ROLE_LABEL[displayRoleDraft.newRole]}
          </p>
          <div className="esc-admin-billing-change-actions">
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-primary"
              disabled={tourRoleReview}
              onClick={() => void confirmRoleChange()}
            >
              Confirm change
            </button>
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-secondary"
              disabled={tourRoleReview}
              onClick={() => setRoleDraft(null)}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {deactivateDraft ? (
        <section className="esc-staff-panel esc-admin-users-review" style={{ marginBottom: 16 }}>
          <h2 className="esc-admin-billing-panel-title">Confirm deactivation</h2>
          <p className="esc-staff-body">
            Deactivate {deactivateDraft.fullName}&apos;s login? They will lose access until
            re-invited.
          </p>
          <div className="esc-admin-billing-change-actions">
            <button type="button" className="esc-staff-btn esc-staff-btn-primary" onClick={() => void confirmDeactivate()}>
              Confirm deactivation
            </button>
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-secondary"
              onClick={() => setDeactivateDraft(null)}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <div style={{ padding: "40px 0" }}>
          <EscolentLoader label="Loading users…" size={22} />
        </div>
      ) : null}
      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}

      <ul className="esc-admin-users-list" data-tour="admin-users-list">
        {payload?.users.map((user) => {
          const viewers = otherViewers[user.id] ?? [];
          const isFocused = focusedId === user.id;
          return (
            <li
              key={user.id}
              className={[
                "esc-staff-panel",
                "esc-admin-users-row",
                isFocused ? "esc-admin-users-row-focused" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <button type="button" className="esc-admin-users-row-button" onClick={() => focusUser(isFocused ? null : user.id)}>
                <div className="esc-admin-users-row-main">
                  <div className="esc-admin-users-row-head">
                    <span className="esc-admin-users-name">{user.fullName}</span>
                    {user.isSelf ? (
                      <span className="esc-admin-users-you">You</span>
                    ) : null}
                  </div>
                  <span className="esc-admin-users-email">{user.email}</span>
                  {user.gradeLabel ? (
                    <span className="esc-admin-users-meta">{user.gradeLabel}</span>
                  ) : null}
                </div>
                <span
                  className={[
                    "esc-admin-users-status",
                    user.status === "active"
                      ? "esc-admin-users-status-active"
                      : user.status === "invited"
                        ? "esc-admin-users-status-invited"
                        : "esc-admin-users-status-deactivated",
                  ].join(" ")}
                >
                  {user.statusLabel}
                </span>
                {user.canChangeRole ? (
                  <select
                    className="esc-mastery-filter-select esc-admin-users-role-select"
                    value={user.role}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation();
                      void changeRoleStructured(user, event.target.value as StaffRole);
                    }}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span className="esc-admin-users-role-fixed">{user.roleLabel}</span>
                )}
              </button>
              {user.status === "invited" ? (
                <button
                  type="button"
                  className="esc-staff-btn esc-staff-btn-secondary esc-admin-users-resend"
                  onClick={() => void resendInvite(user.id, user.email)}
                >
                  Resend
                </button>
              ) : null}
              {user.canDeactivate ? (
                <button
                  type="button"
                  className="esc-staff-btn esc-staff-btn-secondary esc-admin-users-deactivate"
                  onClick={() => {
                    setDeactivateDraft({ userId: user.id, fullName: user.fullName });
                    focusUser(user.id);
                  }}
                >
                  Deactivate
                </button>
              ) : null}
              {isFocused && viewers.length > 0 ? (
                <div className="esc-admin-data-viewers" role="status">
                  <p className="esc-staff-section-label" style={{ marginBottom: 4 }}>
                    Also viewing this record
                  </p>
                  <ul>
                    {viewers.map((viewer) => (
                      <li key={viewer.staffId}>{viewer.displayName}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {payload && payload.recentAudit.length > 0 ? (
        <section className="esc-staff-panel esc-admin-users-audit" style={{ marginTop: 24 }}>
          <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
            Recent audit log
          </p>
          <ul className="esc-admin-users-audit-list">
            {payload.recentAudit.map((entry) => (
              <AuditLine key={entry.id} entry={entry} />
            ))}
          </ul>
        </section>
      ) : null}

      {toast ? <p className="esc-admin-users-toast">{toast}</p> : null}
    </div>
  );
}

export function AdminUsersScreen() {
  return (
    <Suspense fallback={<div className="esc-screen esc-admin-users-screen" style={{ padding: "60px 0", display: "flex", justifyContent: "center" }}><EscolentLoader label="Loading users…" size={24} /></div>}>
      <AdminUsersInner />
    </Suspense>
  );
}
