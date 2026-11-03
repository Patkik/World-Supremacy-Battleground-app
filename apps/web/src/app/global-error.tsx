"use client";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  const shell: React.CSSProperties = { background: "#070709", color: "#f4f5f8", minHeight: "100dvh", padding: "clamp(1.25rem, 5vw, 4rem)", fontFamily: "system-ui, sans-serif" };
  const card: React.CSSProperties = { maxWidth: "42rem", margin: "auto", padding: "clamp(1.5rem, 5vw, 3rem)", background: "#101115", border: "1px solid rgba(244,245,248,.14)" };
  const primary: React.CSSProperties = { display: "inline-flex", alignItems: "center", minHeight: 56, padding: "1rem 1.25rem", border: 0, background: "#d4ff00", color: "#070709", fontWeight: 700, cursor: "pointer" };
  const link: React.CSSProperties = { color: "#f4f5f8", textUnderlineOffset: "0.25em" };
  return <html lang="en"><body style={{ margin: 0 }}>
    <main style={shell}>
      <section style={card} role="alert" aria-labelledby="fatal-error-title">
        <p style={{ color: "#d4ff00", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", margin: 0 }}>WORLD SUPREMACY BATTLEGROUNDS</p>
        <h1 id="fatal-error-title" style={{ fontSize: "clamp(2.25rem, 10vw, 4.5rem)", lineHeight: 0.95, margin: "1.5rem 0 1rem" }}>THIS PAGE COULD NOT OPEN.</h1>
        <p style={{ color: "#d5d9e0", lineHeight: 1.65, maxWidth: "60ch" }}>Try again. If you were submitting a change, check its saved or queued status before trying again.</p>
        <p style={{ margin: "2rem 0 1rem" }}><button onClick={retry} style={primary}>Try again</button></p>
        <p><a style={link} href="/offline">Open offline workspace</a></p>
        <p><a style={link} href="/workspaces">Account access</a></p>
      </section>
    </main>
  </body></html>;
}
