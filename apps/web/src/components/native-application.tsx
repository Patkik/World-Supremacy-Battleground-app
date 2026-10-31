"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { contactRequest, createContact, rememberContact, type ContactAccess, type InquiryInput, type InquiryPage, type InquiryThread } from "@/lib/inquiries";
import { segment } from "@/lib/connected-api";
import { InquiryConversation } from "./inquiry-conversation";
import { PageHeading } from "./ui";

type ApplicationKind = "chapter_application" | "studio_application" | "partner_application";
type Chapter = { id: string; name: string };
type SavedApplication = ContactAccess & { kind: ApplicationKind };

function savedApplications(): SavedApplication[] {
  try { return JSON.parse(sessionStorage.getItem("wsb-application-requests") || "[]") as SavedApplication[]; }
  catch { return []; }
}

function rememberApplication(value: ContactAccess, kind: ApplicationKind) {
  const current = savedApplications().filter(item => item.chapter !== value.chapter || item.id !== value.id);
  sessionStorage.setItem("wsb-application-requests", JSON.stringify([...current, { ...value, kind }]));
}

function applicationLabel(kind: ApplicationKind) {
  if (kind === "chapter_application") return "Chapter partnership proposal";
  if (kind === "studio_application") return "Studio hub proposal";
  return "Partner collaboration proposal";
}

const blank = {
  requester_name: "",
  email: "",
  organization: "",
  region: "",
  role: "",
  website: "",
  message: "",
};

export function NativeApplication({ initialKind = "studio_application" }: { initialKind?: ApplicationKind }) {
  const [kind, setKind] = useState<ApplicationKind>(initialKind);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapter, setChapter] = useState("");
  const [form, setForm] = useState(blank);
  const [access, setAccess] = useState<ContactAccess | null>(null);
  const [saved, setSaved] = useState<SavedApplication[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [restoreChapter, setRestoreChapter] = useState("");
  const [restoreId, setRestoreId] = useState("");
  const [restoreKey, setRestoreKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSaved(savedApplications());
    let active = true;
    async function loadChapters() {
      try {
        const items: Chapter[] = [];
        let cursor: string | null = null;
        let count = 0;
        do {
          const path = `/v1/contact/chapters${cursor ? `?cursor=${segment(cursor)}` : ""}`;
          const page: InquiryPage<Chapter> = await contactRequest(path);
          items.push(...page.items);
          cursor = page.next_page;
          count++;
        } while (cursor && count < 20);
        if (cursor) throw new Error("The chapter directory is too large to load. Try again later.");
        if (active) setChapters(items);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load the chapter directory.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadChapters();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chapter) return;
    setBusy(true);
    setError("");
    const label = applicationLabel(kind);
    const message = [
      `Request type: ${label}`,
      `Organization: ${form.organization.trim()}`,
      `Region: ${form.region.trim()}`,
      `Applicant role: ${form.role.trim()}`,
      `Website: ${form.website.trim() || "Not provided"}`,
      "",
      "Proposal:",
      form.message.trim(),
    ].join("\n");
    const inquiry: InquiryInput = {
      requester_name: form.requester_name,
      email: form.email,
      category: kind,
      subject: `${label}: ${form.organization.trim()}`,
      message,
    };
    try {
      const result = await createContact(chapter, inquiry);
      rememberApplication(result.access, kind);
      setAccess(result.access);
      setSaved(savedApplications());
      setForm(blank);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your request could not be saved. Your entries are still here; retry when connected.");
    } finally {
      setBusy(false);
    }
  }

  async function restore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restoreChapter) return;
    setBusy(true);
    setError("");
    const value = { chapter: restoreChapter, id: restoreId.trim(), secret: restoreKey.trim() };
    try {
      await contactRequest<InquiryThread>(`/v1/chapters/${segment(value.chapter)}/contact/${segment(value.id)}`, value.secret);
      rememberContact(value);
      setSaved(savedApplications());
      setAccess(value);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This proposal could not be reopened.");
    } finally {
      setBusy(false);
    }
  }

  return <main id="main-content" className="section-wrap content-page">
    <PageHeading
      eyebrow="WSB community network"
      title="Bring your community into the movement"
      description="Send a chapter or studio proposal to a regional WSB team and follow the conversation here."
    />
    <div className="connected-stack application-workspace">
      {access ? <>
        <section className="panel application-receipt" aria-labelledby="application-receipt-title">
          <span className="eyebrow">Request received</span>
          <h2 id="application-receipt-title">Your proposal is with the selected chapter team</h2>
          <p>Reference <span className="mono">{access.id}</span></p>
          <p>This is a review request, not an affiliation or partnership approval. Keep the access key private to return to this conversation.</p>
          <label htmlFor="application-access-key">Private access key</label>
          <input id="application-access-key" type={showKey ? "text" : "password"} value={access.secret} readOnly />
          <button type="button" className="button button-outline" onClick={() => setShowKey(value => !value)}>{showKey ? "Hide access key" : "Show access key"}</button>
        </section>
        <InquiryConversation key={`${access.chapter}/${access.id}`} chapter={access.chapter} id={access.id} contact={access} />
        <button type="button" className="button button-outline" onClick={() => setAccess(null)}>Start another proposal</button>
      </> : <>
        {saved.length > 0 && <section className="panel application-saved"><h2>Proposals saved in this browser session</h2>{saved.map(value => <button type="button" className="button button-outline" key={`${value.chapter}/${value.id}`} onClick={() => setAccess(value)}>{applicationLabel(value.kind)} · {value.chapter.toUpperCase()} · {value.id}</button>)}</section>}
        <details className="panel application-restore">
          <summary>Reopen a proposal with its reference and private key</summary>
          <form onSubmit={restore}>
            <label htmlFor="proposal-restore-chapter">Regional chapter team</label>
            <select id="proposal-restore-chapter" value={restoreChapter} onChange={event => setRestoreChapter(event.target.value)} required disabled={loading || chapters.length === 0}>
              <option value="">{loading ? "Loading available chapters…" : "Choose a team"}</option>
              {chapters.map(value => <option value={value.id} key={value.id}>{value.name}</option>)}
            </select>
            <label htmlFor="proposal-restore-reference">Proposal reference</label>
            <input id="proposal-restore-reference" required maxLength={200} value={restoreId} onChange={event => setRestoreId(event.target.value)} />
            <label htmlFor="proposal-restore-key">Private access key</label>
            <input id="proposal-restore-key" type="password" required minLength={64} maxLength={64} value={restoreKey} onChange={event => setRestoreKey(event.target.value)} />
            <button type="submit" className="button button-outline" disabled={busy || !restoreChapter || loading}>Open conversation</button>
          </form>
        </details>
        <form className="panel application-form" onSubmit={submit}>
        <h2>Start a proposal</h2>
        <p>Choose the kind of proposal you want a regional WSB team to review.</p>
        <label htmlFor="application-kind">Proposal type</label>
        <select id="application-kind" value={kind} onChange={event => setKind(event.target.value as ApplicationKind)}>
          <option value="chapter_application">Regional chapter partnership</option>
          <option value="studio_application">Studio hub partnership</option>
          <option value="partner_application">Brand or event partnership</option>
        </select>

        <label htmlFor="application-chapter">Regional chapter team</label>
        <select id="application-chapter" value={chapter} onChange={event => setChapter(event.target.value)} required disabled={loading || chapters.length === 0}>
          <option value="">{loading ? "Loading available chapters…" : chapters.length ? "Choose a team" : "No chapter teams are available"}</option>
          {chapters.map(value => <option value={value.id} key={value.id}>{value.name}</option>)}
        </select>
        <p className="fineprint">The selected team receives the request and can follow up here. This form does not create an affiliation or approved partnership.</p>

        <label htmlFor="application-organization">{kind === "chapter_application" ? "Proposed chapter name" : kind === "studio_application" ? "Studio name" : "Organization name"}</label>
        <input id="application-organization" required maxLength={120} autoComplete="organization" value={form.organization} onChange={event => setForm({ ...form, organization: event.target.value })} />
        <label htmlFor="application-region">City and country or territory</label>
        <input id="application-region" required maxLength={120} autoComplete="address-level2" value={form.region} onChange={event => setForm({ ...form, region: event.target.value })} />
        <label htmlFor="application-role">Your role in the organization</label>
        <input id="application-role" required maxLength={100} autoComplete="organization-title" value={form.role} onChange={event => setForm({ ...form, role: event.target.value })} />
        <label htmlFor="application-name">Your name</label>
        <input id="application-name" required maxLength={100} autoComplete="name" value={form.requester_name} onChange={event => setForm({ ...form, requester_name: event.target.value })} />
        <label htmlFor="application-email">Contact email</label>
        <input id="application-email" type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} />
        <label htmlFor="application-website">Website or public profile (optional)</label>
        <input id="application-website" type="url" maxLength={500} autoComplete="url" value={form.website} onChange={event => setForm({ ...form, website: event.target.value })} />
        <label htmlFor="application-message">Tell the team about your proposal</label>
        <textarea id="application-message" required rows={6} maxLength={3000} value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} />
        <p className="fineprint">Do not include identity documents, passwords, payment details, or information about minors. Your request will be stored as a private chapter conversation; check this page to follow replies.</p>
        <button className="button button-volt" disabled={busy || loading || !chapter}>{busy ? "Sending proposal…" : "Send proposal for review"}</button>
        <p className="fineprint">Need a different kind of help? <Link className="text-link" href="/contact">Contact WSB support</Link>.</p>
        </form>
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  </main>;
}
