"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getBytes, getMetadata, ref, uploadBytesResumable } from "firebase/storage";
import { useWorkspaceSession } from "@/lib/account";
import { connectedPage, connectedRequest, segment } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";
import { firebaseClient } from "@/lib/firebase/client";
import { PageHeading, Status } from "./ui";

type Purpose = "identity" | "residency";
type CaseStatus = "uploading" | "pending" | "approved" | "needs_correction";
type VerificationCase = {
  case_id: string;
  chapter_id: string;
  dancer_uid: string;
  purpose: Purpose;
  status: CaseStatus;
  storage_path: string;
  content_type: string | null;
  size_bytes: number | null;
  created_at: number;
  submitted_at: number | null;
  reviewed_at: number | null;
  reviewer_note: string | null;
};
function labelStatus(value: CaseStatus) {
  return value.replaceAll("_", " ");
}

export function VerificationWorkspace({ mode, chapterId }: { mode: "participant" | "review"; chapterId?: string }) {
  const { session, loading, error: accessError } = useWorkspaceSession();
  const chapter = mode === "review" ? chapterId ?? "" : session?.chapter_id ?? "";
  const endpoint = chapter ? `/v1/chapters/${segment(chapter)}/verification` : "";
  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [purpose, setPurpose] = useState<Purpose>("identity");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [activeUpload, setActiveUpload] = useState<VerificationCase | null>(null);
  const [resumeFiles, setResumeFiles] = useState<Record<string, File | null>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [openCase, setOpenCase] = useState("");
  const [objectUrl, setObjectUrl] = useState("");
  const [loadingCases, setLoadingCases] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isChapterMatch = mode !== "review" || session?.chapter_id === chapterId;
  const loadGeneration = useRef(0);

  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  const load = useCallback(async () => {
    if (!endpoint || !session || !isChapterMatch) return;
    const generation = ++loadGeneration.current;
    setLoadingCases(true); setError("");
    try {
      const items: VerificationCase[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const result: { items: VerificationCase[]; next_page: string | null } = await connectedPage<VerificationCase>(endpoint, cursor);
        items.push(...result.items);
        cursor = result.next_page;
        pages++;
      } while (cursor && pages < 100);
      if (cursor) throw new Error("Too many verification records to load at once. Narrow the chapter queue before retrying.");
      if (generation === loadGeneration.current) setCases(current => {
        const loadedIds = new Set(items.map(value => value.case_id));
        return [...items, ...current.filter(value => !loadedIds.has(value.case_id))];
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load verification records.");
    } finally { setLoadingCases(false); }
  }, [endpoint, session, isChapterMatch]);

  useEffect(() => { void load(); }, [load]);

  const unfinished = useMemo(() => cases.filter(value => value.status === "uploading"), [cases]);

  async function finishUpload(value: VerificationCase) {
    setBusy(true); setError(""); setMessage("");
    try {
      const storage = firebaseClient().storage;
      await getMetadata(ref(storage, value.storage_path));
      const saved = await connectedRequest<VerificationCase>(`${endpoint}/${segment(value.case_id)}/submit`, undefined, "POST", undefined, true);
      ++loadGeneration.current;
      setCases(current => current.some(item => item.case_id === saved.case_id)
        ? current.map(item => item.case_id === saved.case_id ? saved : item)
        : [saved, ...current]);
      setActiveUpload(null); setFile(null);
      setMessage(`Submission received. Reference ${saved.case_id}.`);
    } catch (reason) {
      const code = typeof reason === "object" && reason !== null && "code" in reason ? String(reason.code) : "";
      setError(code === "storage/object-not-found" ? "No completed file was found for this reference. Select a document below to resume the upload." : "The submission could not be confirmed. Check your connection, then retry or refresh your history.");
    } finally { setBusy(false); }
  }

  async function uploadDocument(value: VerificationCase, selected: File) {
    setBusy(true); setError(""); setMessage(""); setUploadPercent(0);
    try {
      setActiveUpload(value);
      const storage = firebaseClient().storage;
      const task = uploadBytesResumable(ref(storage, value.storage_path), selected, { contentType: selected.type });
      await new Promise<void>((resolve, reject) => task.on(
        "state_changed",
        snapshot => setUploadPercent(snapshot.totalBytes ? Math.round(snapshot.bytesTransferred * 100 / snapshot.totalBytes) : 0),
        reject,
        resolve,
      ));
      await finishUpload(value);
    } catch (reason) {
      setError("The private upload could not be confirmed. If the file finished uploading, use Check and submit; otherwise select it below to resume.");
    } finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !endpoint) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const created = await registrationCommand<VerificationCase>(endpoint, { purpose });
      ++loadGeneration.current;
      setCases(current => [created, ...current.filter(item => item.case_id !== created.case_id)]);
      if (created.status !== "uploading") {
        setMessage(`Existing submission ${created.case_id} is ${labelStatus(created.status)}. Refresh the history for its latest state.`);
        return;
      }
      await uploadDocument(created, file);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The request could not be confirmed. Keep your document selected and retry.");
    } finally { setBusy(false); }
  }

  async function openEvidence(value: VerificationCase) {
    setBusy(true); setError("");
    try {
      const data = await getBytes(ref(firebaseClient().storage, value.storage_path), 10 * 1024 * 1024);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setObjectUrl(URL.createObjectURL(new Blob([data], { type: value.content_type ?? "application/octet-stream" })));
      setOpenCase(value.case_id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This private document could not be opened.");
    } finally { setBusy(false); }
  }

  async function review(value: VerificationCase, status: "approved" | "needs_correction") {
    setBusy(true); setError(""); setMessage("");
    try {
      const updated = await registrationCommand<VerificationCase>(`${endpoint}/${segment(value.case_id)}/review`, {
        status,
        note: reviewNotes[value.case_id]?.trim() || null,
      }, "POST", true);
      setCases(current => current.map(item => item.case_id === value.case_id ? updated : item));
      setOpenCase(""); setMessage(`Review saved for ${value.case_id}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save the review.");
    } finally { setBusy(false); }
  }

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={mode === "review" ? "Private chapter queue" : "Your private records"}
      title={mode === "review" ? "Verification review" : "Identity evidence"}
      description={mode === "review" ? "Review submitted evidence using chapter-scoped access. Opening the document is required before recording a decision." : "Submit identity or residency evidence directly to your chapter. Your private file stays out of rosters and public results."}
    />
    <div className="connected-stack verification-workspace">
      {loading ? <p role="status">Checking chapter access…</p>
        : !session ? <p className="form-error" role="alert">{accessError || "Sign in with an approved chapter account to continue."}</p>
          : !isChapterMatch ? <p className="form-error" role="alert">This account is not signed into the chapter that owns this queue.</p>
            : <>
              {mode === "participant" && <form className="panel verification-form" onSubmit={submit}>
                <h2>Submit evidence</h2>
                <p>Choose a purpose, then attach one PDF, JPEG or PNG document up to 10 MB.</p>
                <label htmlFor="verification-purpose">Evidence purpose</label>
                <select id="verification-purpose" value={purpose} onChange={event => setPurpose(event.target.value as Purpose)} disabled={busy}>
                  <option value="identity">Identity</option><option value="residency">Residency</option>
                </select>
                <label htmlFor="verification-file">Document</label>
                <input id="verification-file" type="file" accept="application/pdf,image/jpeg,image/png" onChange={event => setFile(event.target.files?.[0] ?? null)} disabled={busy} required />
                {activeUpload && <p role="status">Private upload {uploadPercent}% complete · reference {activeUpload.case_id}</p>}
                <button className="button button-volt" disabled={busy || !file}>{busy ? "Working…" : "Upload and submit"}</button>
                <p className="fineprint">The chapter has not approved an official document list or retention period yet. Staff review here does not record event consent or verify a guardian relationship; age and guardian policies remain separate release gates.</p>
              </form>}
              {mode === "participant" && unfinished.length > 0 && <section className="panel">
                <h2>Finish an interrupted upload</h2>
                <p>If your file finished uploading, check and submit it. Otherwise, select a document to resume this reference. Existing files cannot be replaced.</p>
                {unfinished.map(value => <div className="verification-row" key={value.case_id}><div><strong>{value.purpose} evidence</strong><span>{value.case_id}</span></div><button className="button button-outline" disabled={busy} onClick={() => void finishUpload(value)}>Check and submit</button><label htmlFor={`resume-${value.case_id}`}>Document for this reference</label><input id={`resume-${value.case_id}`} type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={event => setResumeFiles(current => ({ ...current, [value.case_id]: event.target.files?.[0] ?? null }))} /><button className="button button-outline" disabled={busy || !resumeFiles[value.case_id]} onClick={() => { const selected = resumeFiles[value.case_id]; if (selected) void uploadDocument(value, selected); }}>Resume upload</button></div>)}
              </section>}
              <section className="panel verification-list">
                <div className="panel-heading"><div><span className="eyebrow">{mode === "review" ? "Chapter submissions" : "Submission history"}</span><h2>{loadingCases ? "Loading records…" : `${cases.length} records`}</h2></div><button className="button button-outline" onClick={() => void load()} disabled={loadingCases || busy}>Refresh</button></div>
                {cases.length === 0 && !loadingCases ? <p className="fineprint">No verification records are available in this chapter scope.</p> : cases.map(value => <article className="verification-row" key={value.case_id}>
                  <div className="verification-record"><strong>{value.purpose} evidence</strong><span>Reference <span className="mono">{value.case_id}</span>{mode === "review" ? ` · participant ${value.dancer_uid}` : ""}</span>{value.reviewer_note && <span>Review note: {value.reviewer_note}</span>}</div>
                  <Status tone={value.status === "approved" ? "volt" : value.status === "needs_correction" ? "crimson" : "amber"}>{labelStatus(value.status)}</Status>
                  {mode === "review" && value.status === "pending" && <div className="verification-review">
                    {openCase === value.case_id && objectUrl ? <iframe title={`Private evidence ${value.case_id}`} src={objectUrl} /> : <button className="button button-outline" onClick={() => void openEvidence(value)} disabled={busy}>Open private document</button>}
                    <label htmlFor={`review-note-${value.case_id}`}>Correction note (optional)</label>
                    <textarea id={`review-note-${value.case_id}`} maxLength={500} value={reviewNotes[value.case_id] ?? ""} onChange={event => setReviewNotes(current => ({ ...current, [value.case_id]: event.target.value }))} />
                    <div className="verification-actions"><button className="button button-outline" disabled={busy || openCase !== value.case_id} onClick={() => void review(value, "needs_correction")}>Request new evidence</button><button className="button button-volt" disabled={busy || openCase !== value.case_id} onClick={() => void review(value, "approved")}>Approve review</button></div>
                  </div>}
                </article>)}
              </section>
            </>}
      {message && <p role="status" className="info-note">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  </main>;
}
