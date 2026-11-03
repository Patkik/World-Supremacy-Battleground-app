"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { useWorkspaceSession } from "@/lib/account";
import { registrationCommand } from "@/lib/registration-command";
import type { Crew } from "@/lib/api";

function messageFor(error: unknown, saving: boolean) {
  if (error instanceof ApiError && error.status === 401) return "Your session expired. Sign in again before continuing.";
  if (error instanceof ApiError && error.status === 403) return "Only this crew’s active manager can update its profile.";
  if (error instanceof ApiError && error.status === 404) return "This crew is not available in your current chapter.";
  if (error instanceof ApiError && error.status === 409) return "The crew changed elsewhere. Reload the saved record before trying again.";
  return error instanceof Error ? error.message : saving ? "Crew details could not be saved." : "Crew details could not be loaded.";
}

export default function CrewSettingsPage({ params }: { params: Promise<{ crewId: string }> }) {
  const { crewId } = use(params);
  const { session, loading: sessionLoading, error: sessionError } = useWorkspaceSession();
  const [crew, setCrew] = useState<Crew | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (sessionLoading) return;
      if (!session) {
        setError(sessionError || "Sign in with your chapter account to continue.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const path = `/v1/chapters/${segment(session.chapter_id)}/crews/${segment(crewId)}`;
        const record = await connectedRequest<Crew>(path, undefined, "GET", session.uid);
        if (!active) return;
        setCrew(record);
        setName(record.name);
        setCity(record.city);
      } catch (cause) {
        if (active) setError(messageFor(cause, false));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [crewId, session, sessionError, sessionLoading]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !crew || crew.manager_uid !== session.uid) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const path = `/v1/chapters/${segment(session.chapter_id)}/crews/${segment(crew.id)}`;
      const updated = await registrationCommand<Crew>(path, {
        expected_revision: crew.revision ?? 0,
        name,
        city,
      }, "PUT", false, session.uid);
      setCrew(updated);
      setName(updated.name);
      setCity(updated.city);
      setMessage("Crew profile saved.");
    } catch (cause) {
      setError(messageFor(cause, true));
    } finally {
      setSaving(false);
    }
  }

  if (sessionLoading || loading) return <main id="main-content" className="workspace-main"><PageHeading eyebrow="Crew settings" title="Loading settings" description="Checking your chapter session and saved crew record." /><p role="status">Loading saved crew details…</p></main>;

  if (error && !crew) return <main id="main-content" className="workspace-main"><PageHeading eyebrow="Crew settings" title="Crew settings unavailable" description="The saved crew could not be loaded." /><section className="panel" role="alert"><p className="form-error">{error}</p><Link href="/workspaces" className="button button-outline">Account access</Link></section></main>;

  const canEdit = !!session && crew?.manager_uid === session.uid;

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`${crew?.name || "Crew"} / profile`}
      title="Crew settings"
      description="Update the saved crew name and hometown. Changes use the current chapter session and record revision."
      action={<Link href={`/app/crews/${segment(crewId)}`} className="button button-outline">Back to overview <Arrow /></Link>}
    />
    {message && <p className="info-note" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="max-w-xl">
      <section className="panel mb-8">
        <div className="panel-heading"><h2>Identity and profile</h2>{canEdit ? <Status tone="volt">Manager access</Status> : <Status tone="amber">Read only</Status>}</div>
        <form onSubmit={handleSave} className="connected-stack">
          <div>
            <label htmlFor="crew-name">Crew name</label>
            <input id="crew-name" type="text" value={name} onChange={event => setName(event.target.value)} required maxLength={120} disabled={!canEdit || saving} className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt" />
            <span className="text-xs text-titanium mt-1 block">This name appears on the crew profile and connected event entries.</span>
          </div>
          <div>
            <label htmlFor="crew-city">Hometown or city</label>
            <input id="crew-city" type="text" value={city} onChange={event => setCity(event.target.value)} required maxLength={120} disabled={!canEdit || saving} className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt" />
          </div>
          {canEdit && <button type="submit" disabled={saving} className="button button-volt">{saving ? "Saving…" : "Save crew profile"} <Arrow /></button>}
          {!canEdit && <p className="text-sm text-[var(--ink-muted)]">Only the crew manager can edit these fields.</p>}
        </form>
      </section>

      <section className="panel" aria-labelledby="archive-heading">
        <div className="panel-heading"><h2 id="archive-heading">Crew archive</h2><Status tone="amber">Unavailable</Status></div>
        <p>Archiving is not connected. This workspace will not cancel entries or revoke invitations through a local-only action.</p>
      </section>
    </div>
  </main>;
}
