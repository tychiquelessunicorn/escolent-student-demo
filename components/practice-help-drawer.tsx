"use client";

const HELP_OPTIONS = [
  {
    id: "socratic",
    label: "Get a Socratic Hint",
    response:
      "What happens to the equation if you subtract 2x from both sides? Try naming what stays on each side before you solve for x.",
  },
  {
    id: "steps",
    label: "Break down the steps",
    response:
      "Step 1: Subtract 2x from both sides → 3x + 3 = 18\nStep 2: Subtract 3 from both sides → 3x = 15\nStep 3: Divide both sides by 3 → x = 5",
  },
  {
    id: "concept",
    label: "Explain the concept",
    response:
      "When x appears on both sides, the goal is to collect all variable terms on one side — just like balancing a scale. Once they're together, you're back to a two-step equation you already know how to finish.",
  },
] as const;

export function PracticeHelpDrawer({
  open,
  loading,
  drawerContent,
  onClose,
  onSelect,
}: {
  open: boolean;
  loading: boolean;
  drawerContent: string;
  onClose: () => void;
  onSelect: (response: string) => void;
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
          <div style={{ fontSize: 16, fontWeight: 700 }}>Need help?</div>
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
          Choose how you&apos;d like support — AI responses are simulated for this demo.
        </p>
        {HELP_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className="esc-help-option esc-pressable"
            onClick={() => onSelect(option.response)}
          >
            {option.label}
          </button>
        ))}
        {loading ? (
          <div className="esc-ai-thinking" style={{ marginTop: 8 }}>
            <div className="esc-ai-spinner" />
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
