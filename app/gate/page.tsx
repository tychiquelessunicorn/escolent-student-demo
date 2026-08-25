export const metadata = { title: "Escolent" };

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/practice", error } = await searchParams;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "var(--font-body)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-card)",
          padding: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 22,
            marginBottom: 8,
          }}
        >
          Escolent
        </div>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--color-content-secondary)",
            margin: "0 0 24px",
          }}
        >
          This is a private demo. Enter the access phrase to continue.
        </p>

        <form method="post" action="/api/gate">
          <input type="hidden" name="next" value={next} />
          <label
            htmlFor="password"
            style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}
          >
            Access phrase
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            style={{
              width: "100%",
              boxSizing: "border-box",
              fontFamily: "var(--font-body)",
              fontSize: 15,
              padding: "11px 16px",
              borderRadius: "var(--radius-control)",
              border: `1px solid ${error ? "var(--color-error)" : "var(--color-border)"}`,
              background: "var(--color-surface-raised)",
              color: "var(--color-content-primary)",
            }}
          />
          {error ? (
            <div style={{ fontSize: 12, color: "var(--color-error)", marginTop: 6 }}>
              That phrase didn&rsquo;t match. Try again.
            </div>
          ) : null}
          <button
            type="submit"
            style={{
              marginTop: 20,
              width: "100%",
              fontFamily: "var(--font-body)",
              fontSize: 15,
              fontWeight: 600,
              padding: "12px 24px",
              borderRadius: "var(--radius-control)",
              border: "none",
              background: "var(--color-accent)",
              color: "var(--color-surface-raised)",
              cursor: "pointer",
            }}
          >
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}
