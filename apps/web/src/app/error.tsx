"use client";

export default function ErrorBoundary({ retry }: { error: unknown; retry: () => void }) {
  return <main id="main-content" className="section-wrap">
    <section className="panel connected-stack" role="alert">
      <h1>This page could not be displayed</h1>
      <p>Try opening it again. If you were submitting a change, check its saved or queued status before trying again.</p>
      <button className="button button-volt" onClick={retry}>Try again</button>
      <a className="button button-outline" href="/offline">Open offline workspace</a>
      <a className="text-link" href="/workspaces">Account access</a>
    </section>
  </main>;
}
