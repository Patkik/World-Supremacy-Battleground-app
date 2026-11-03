"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getBytes, getMetadata, ref, uploadBytesResumable, type UploadTask } from "firebase/storage";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedPage, connectedRequest, segment } from "@/lib/connected-api";
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
type DocumentContentType = "application/pdf" | "image/jpeg" | "image/png";
const maxDocumentBytes = 10 * 1024 * 1024;

function validVerificationCase(value: unknown, chapter: string, expectedUid?: string): value is VerificationCase {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<VerificationCase>;
  const purposeValid = item.purpose === "identity" || item.purpose === "residency";
  const statusValid = item.status === "uploading" || item.status === "pending" || item.status === "approved" || item.status === "needs_correction";
  const contentTypeValid = item.content_type === null || item.content_type === "application/pdf" || item.content_type === "image/jpeg" || item.content_type === "image/png";
  if (!purposeValid || !statusValid || typeof item.case_id !== "string" || !item.case_id || item.case_id.length > 160 || typeof item.dancer_uid !== "string" || !item.dancer_uid || item.dancer_uid.length > 256 || item.chapter_id !== chapter || !contentTypeValid) return false;
  if (expectedUid && item.dancer_uid !== expectedUid) return false;
  const storagePath = `chapters/${segment(chapter)}/verification/${segment(item.dancer_uid)}/${segment(item.case_id)}/document`;
  return item.storage_path === storagePath && Number.isSafeInteger(item.created_at) && (item.created_at as number) > 0 &&
    (item.submitted_at === null || Number.isSafeInteger(item.submitted_at)) &&
    (item.reviewed_at === null || Number.isSafeInteger(item.reviewed_at)) &&
    (item.content_type === null || typeof item.content_type === "string") &&
    (item.size_bytes === null || (Number.isSafeInteger(item.size_bytes) && (item.size_bytes as number) >= 0 && (item.size_bytes as number) <= maxDocumentBytes)) &&
    (item.reviewer_note === null || typeof item.reviewer_note === "string");
}

function documentContentType(file: File): DocumentContentType | null {
  const byExtension: Record<string, DocumentContentType> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
  };
  const byMime: Record<string, DocumentContentType> = {
    "application/pdf": "application/pdf",
    "image/jpeg": "image/jpeg",
    "image/png": "image/png",
  };
  const extensionType = byExtension[file.name.split(".").pop()?.toLowerCase() ?? ""];
  const mimeType = byMime[file.type.toLowerCase()];
  if (extensionType && mimeType && extensionType !== mimeType) return null;
  return extensionType ?? mimeType ?? null;
}

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
  const [caseCursor, setCaseCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isChapterMatch = mode !== "review" || session?.chapter_id === chapterId;
  const loadGeneration = useRef(0);
  const uploadTask = useRef<UploadTask | null>(null);
  const scopeKey = `${session?.uid ?? "signed-out"}/${chapter}/${mode}`;
  const priorScope = useRef(scopeKey);

  useEffect(() => {
    if (priorScope.current === scopeKey) return;
    priorScope.current = scopeKey;
    ++loadGeneration.current;
    uploadTask.current?.cancel();
    uploadTask.current = null;
    setCases([]); setCaseCursor(null); setOpenCase(""); setActiveUpload(null);
    setFile(null); setResumeFiles({}); setReviewNotes({}); setMessage(""); setError("");
    setLoadingCases(false); setBusy(false); setUploadPercent(0);
    setObjectUrl(current => { if (current) URL.revokeObjectURL(current); return ""; });
  }, [scopeKey]);

  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  const load = useCallback(async (cursor?: string | null, append = false) => {
    if (!endpoint || !session || !isChapterMatch) return;
    const generation = ++loadGeneration.current;
    setLoadingCases(true); setError("");
    try {
      const result = await connectedPage<VerificationCase>(endpoint, cursor, session.uid);
      if (!Array.isArray(result.items) || result.items.some(value => !validVerificationCase(value, chapter, mode === "participant" ? session.uid : undefined)) || (result.next_page !== null && typeof result.next_page !== "string")) throw new Error("Verification records could not be verified for this chapter and account.");
      if (generation === loadGeneration.current) {
        setCases(current => {
          if (!append) return result.items;
          const loadedIds = new Set(result.items.map(value => value.case_id));
          return [...current.filter(value => !loadedIds.has(value.case_id)), ...result.items];
        });
        setCaseCursor(result.next_page);
      }
    } catch (reason) {
      if (generation === loadGeneration.current) setError(reason instanceof Error ? reason.message : "Unable to load verification records.");
    } finally { if (generation === loadGeneration.current) setLoadingCases(false); }
  }, [endpoint, session, isChapterMatch]);

  useEffect(() => { void load(); }, [load]);

  const unfinished = useMemo(() => cases.filter(value => value.status === "uploading"), [cases]);

  async function finishUpload(value: VerificationCase) {
    if (!session) return;
    const generation = loadGeneration.current;
    setBusy(true); setError(""); setMessage("");
    try {
      const storage = firebaseClient().storage;
      await getMetadata(ref(storage, value.storage_path));
      const saved = await connectedRequest<VerificationCase>(`${endpoint}/${segment(value.case_id)}/submit`, undefined, "POST", session.uid, true);
      if (!validVerificationCase(saved, chapter, mode === "participant" ? session.uid : undefined) || saved.case_id !== value.case_id || saved.purpose !== value.purpose) throw new Error("Submission response could not be verified for this account and chapter.");
      if (generation !== loadGeneration.current) return;
      ++loadGeneration.current;
      setBusy(false);
      setLoadingCases(false);
      setCases(current => current.some(item => item.case_id === saved.case_id)
        ? current.map(item => item.case_id === saved.case_id ? saved : item)
        : [saved, ...current]);
      setActiveUpload(null); setFile(null);
      setMessage(`Submission received. Reference ${saved.case_id}.`);
    } catch (reason) {
      const code = typeof reason === "object" && reason !== null && "code" in reason ? String(reason.code) : "";
      if (generation === loadGeneration.current) setError(reason instanceof ApiError && reason.status === 422 ? "The document failed its format or safety scan. Choose another file or contact support if you think this is a mistake." : reason instanceof ApiError && reason.status === 413 ? "The document is too large or complex for safe processing. Choose another file or contact support." : reason instanceof ApiError && reason.status === 503 ? "File safety scanning is unavailable, so the document was not submitted. Try again later." : code === "storage/object-not-found" ? "No completed file was found for this reference. Select a document below to resume the upload." : "The submission could not be confirmed. Check your connection, then retry or refresh your history.");
    } finally { if (generation === loadGeneration.current) setBusy(false); }
  }

  async function uploadDocument(value: VerificationCase, selected: File) {
    const contentType = documentContentType(selected);
    if (!contentType || selected.size === 0 || selected.size > maxDocumentBytes) {
      setError("Choose a non-empty PDF, JPEG or PNG document no larger than 10 MiB. The file extension and browser file type must agree.");
      return;
    }
    if (!navigator.onLine) {
      setError("Connect to the internet before uploading private evidence. Your case has not been changed.");
      return;
    }
    const generation = loadGeneration.current;
    setBusy(true); setError(""); setMessage(""); setUploadPercent(0);
    try {
      setActiveUpload(value);
      const storage = firebaseClient().storage;
      const task = uploadBytesResumable(ref(storage, value.storage_path), selected, { contentType });
      uploadTask.current = task;
      await new Promise<void>((resolve, reject) => task.on(
        "state_changed",
        snapshot => { if (generation === loadGeneration.current) setUploadPercent(snapshot.totalBytes ? Math.round(snapshot.bytesTransferred * 100 / snapshot.totalBytes) : 0); },
        reject,
        resolve,
      ));
      if (uploadTask.current === task) uploadTask.current = null;
      if (generation !== loadGeneration.current) return;
      await finishUpload(value);
    } catch (reason) {
      if (uploadTask.current) uploadTask.current = null;
      if (generation === loadGeneration.current) setError("The private upload could not be confirmed. If the file finished uploading, use Check and submit; otherwise select it below to resume.");
    } finally { if (generation === loadGeneration.current) setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !endpoint) return;
    const contentType = documentContentType(file);
    if (!contentType || file.size === 0 || file.size > maxDocumentBytes) {
      setError("Choose a non-empty PDF, JPEG or PNG document no larger than 10 MiB. The file extension and browser file type must agree.");
      return;
    }
    if (!navigator.onLine) {
      setError("Connect to the internet before creating a private upload reference.");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    const generation = loadGeneration.current;
    try {
      const expectedUid = session?.uid;
      if (!expectedUid) throw new Error("Sign in to continue.");
      const created = await registrationCommand<VerificationCase>(endpoint, { purpose }, "POST", false, expectedUid);
      if (!validVerificationCase(created, chapter, expectedUid) || created.purpose !== purpose) throw new Error("Upload reference could not be verified for this account and chapter.");
      if (generation !== loadGeneration.current) return;
      ++loadGeneration.current;
      setLoadingCases(false);
      setCases(current => [created, ...current.filter(item => item.case_id !== created.case_id)]);
      if (created.status !== "uploading") {
        setBusy(false);
        setMessage(`Existing submission ${created.case_id} is ${labelStatus(created.status)}. Refresh the history for its latest state.`);
        return;
      }
      await uploadDocument(created, file);
    } catch (reason) {
      if (generation === loadGeneration.current) setError(reason instanceof Error ? reason.message : "The request could not be confirmed. Keep your document selected and retry.");
    } finally { if (generation === loadGeneration.current) setBusy(false); }
  }

  async function openEvidence(value: VerificationCase) {
    if (!session) return;
    const generation = loadGeneration.current;
    setBusy(true); setError("");
    try {
      const data = await getBytes(ref(firebaseClient().storage, value.storage_path), 10 * 1024 * 1024);
      if (generation !== loadGeneration.current) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setObjectUrl(URL.createObjectURL(new Blob([data], { type: value.content_type ?? "application/octet-stream" })));
      setOpenCase(value.case_id);
    } catch (reason) {
      if (generation === loadGeneration.current) setError(reason instanceof Error ? reason.message : "This private document could not be opened.");
    } finally { if (generation === loadGeneration.current) setBusy(false); }
  }

  async function review(value: VerificationCase, status: "approved" | "needs_correction") {
    if (!session) return;
    const generation = loadGeneration.current;
    setBusy(true); setError(""); setMessage("");
    try {
      const updated = await registrationCommand<VerificationCase>(`${endpoint}/${segment(value.case_id)}/review`, {
        status,
        note: reviewNotes[value.case_id]?.trim() || null,
      }, "POST", true, session.uid);
      if (!validVerificationCase(updated, chapter) || updated.case_id !== value.case_id || updated.dancer_uid !== value.dancer_uid || updated.status !== status) throw new Error("Review response could not be verified for this chapter and case.");
      if (generation !== loadGeneration.current) return;
      setCases(current => current.map(item => item.case_id === value.case_id ? updated : item));
      setOpenCase("");
      setObjectUrl(current => { if (current) URL.revokeObjectURL(current); return ""; });
      setMessage(`Review saved for ${value.case_id}.`);
    } catch (reason) {
      if (generation === loadGeneration.current) setError(reason instanceof Error ? reason.message : "Unable to save the review.");
    } finally { if (generation === loadGeneration.current) setBusy(false); }
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
                <div className="panel-heading"><div><span className="eyebrow">{mode === "review" ? "Chapter submissions" : "Submission history"}</span><h2>{loadingCases ? "Loading records…" : `${cases.length} records loaded`}</h2></div><button className="button button-outline" onClick={() => void load()} disabled={loadingCases || busy}>Refresh</button></div>
                {cases.length === 0 && !loadingCases && !caseCursor ? <p className="fineprint">No verification records are available in this chapter scope.</p> : cases.length === 0 && caseCursor ? <p className="fineprint">No records on this page. More chapter records are available below.</p> : cases.map(value => <article className="verification-row" key={value.case_id}>
                  <div className="verification-record"><strong>{value.purpose} evidence</strong><span>Reference <span className="mono">{value.case_id}</span>{mode === "review" ? ` · participant ${value.dancer_uid}` : ""}</span>{value.reviewer_note && <span>Review note: {value.reviewer_note}</span>}</div>
                  <Status tone={value.status === "approved" ? "volt" : value.status === "needs_correction" ? "crimson" : "amber"}>{labelStatus(value.status)}</Status>
                  {mode === "review" && value.status === "pending" && <div className="verification-review">
                    {openCase === value.case_id && objectUrl ? <iframe title={`Private evidence ${value.case_id}`} src={objectUrl} /> : <button className="button button-outline" onClick={() => void openEvidence(value)} disabled={busy}>Open private document</button>}
                    <label htmlFor={`review-note-${value.case_id}`}>Correction note (optional)</label>
                    <textarea id={`review-note-${value.case_id}`} maxLength={500} value={reviewNotes[value.case_id] ?? ""} onChange={event => setReviewNotes(current => ({ ...current, [value.case_id]: event.target.value }))} />
                    <div className="verification-actions"><button className="button button-outline" disabled={busy || openCase !== value.case_id} onClick={() => void review(value, "needs_correction")}>Request new evidence</button><button className="button button-volt" disabled={busy || openCase !== value.case_id} onClick={() => void review(value, "approved")}>Approve review</button></div>
                  </div>}
                </article>)}
                {caseCursor && <button className="button button-outline" type="button" onClick={() => void load(caseCursor, true)} disabled={loadingCases || busy}>{loadingCases ? "Loading records…" : "Load more records"}</button>}
              </section>
            </>}
      {message && <p role="status" className="info-note">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  </main>;
}
