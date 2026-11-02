"use client";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return <html lang="en"><body>
    <main style={{ maxWidth: "42rem", margin: "4rem auto", padding: "1.5rem", fontFamily: "system-ui" }}>
      <h1>WSB could not open this page</h1>
      <p>Try again. If you were submitting a change, check its saved status before submitting again.</p>
      <button onClick={retry} style={{ minHeight: 56, padding: "1rem" }}>Try again</button>
      <p><a href="/offline">Open saved scores</a></p>
      <p><a href="/workspaces">Account access</a></p>
    </main>
  </body></html>;
}
