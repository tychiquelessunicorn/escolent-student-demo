"use client";

import { EscolentLoadingIcon } from "@/components/escolent-logo";

const HELP_OPTIONS = [
  { id: "socratic" as const, label: "Get a Socratic Hint" },
  { id: "steps" as const, label: "Break down the steps" },
  { id: "concept" as const, label: "Explain the concept" },
];

export function PracticeHelpDrawer({
  open,
  loading,
  drawerContent,
  onClose,
  onSelectOption,
}: {
  open: boolean;
  loading: boolean;
  drawerContent: string;
  onClose: () => void;
  onSelectOption: (kind: "socratic" | "steps" | "concept") => void;
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="esc-help-backdrop"
        aria-label="Close help drawer"
        onClick={onClose}
      />
      <aside className="esc-help-drawer esc-help-drawer-open" aria-label="Practice help">
        <div className="esc-help-drawer-header">
          <div style={{ fontSize: 16, fontWeight: 700 }}>Socratic AI guidance</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              color: "var(--color-content-muted)",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-content-muted)",
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          Progressive hints match your attempt count — simulated AI for this demo.
        </p>
        {HELP_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className="esc-help-option esc-pressable"
            onClick={() => onSelectOption(option.id)}
          >
            {option.label}
          </button>
        ))}
        {loading ? (
          <div className="esc-ai-thinking" style={{ marginTop: 8 }}>
            <EscolentLoadingIcon size={15} />
            AI Thinking…
          </div>
        ) : null}
        {!loading && drawerContent ? (
          <div className="esc-help-response">{drawerContent}</div>
        ) : null}
      </aside>
    </>
  );
}
