"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getMetadata, ref, uploadBytesResumable, type UploadTask } from "firebase/storage";
import { apiBase, ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { firebaseClient } from "@/lib/firebase/client";
import { apiToken } from "@/lib/firebase/api-session";
import { registrationCommand } from "@/lib/registration-command";

type AudioFormat = "wav" | "mp3";
type AudioContentType = "audio/wav" | "audio/mpeg";
type Inspection = { format: AudioFormat; content_type: AudioContentType; duration_ms: number; sample_rate: number; channels: number; bits_per_sample: number | null; saved: false };
type SavedInspection = Omit<Inspection, "saved"> & { saved: true; approved: false; sha256: string };
type Intent = { intent_id: string; chapter_id: string; event_id: string; entry_id: string; owner_uid: string; entry_revision: number; storage_path: string; expires_at: number };
type Recovery = { operationId: string; expectedRevision: number; digest: string; size: number; intent?: Intent };
type Submission = { intent_id: string; version: number; status: string; duration_ms: number; review_note: string | null };
const maximumBytes = 25 * 1024 * 1024;
function contentTypeFor(file: File): AudioContentType {
  return file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/wav";
}

export function AudioInspection({ chapterId, eventId, entryId, uid, revision, editable }: { chapterId: string; eventId: string; entryId: string; uid: string; revision: number; editable: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Inspection | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<SavedInspection | null>(null);
  const [progress, setProgress] = useState(0);
  const [savedIntent, setSavedIntent] = useState("");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissionLoaded, setSubmissionLoaded] = useState(false);
  const active = useRef<AbortController | null>(null);
  const upload = useRef<UploadTask | null>(null);
  const mounted = useRef(true);
  const storageKey = `wsb-music:${JSON.stringify([uid, chapterId, eventId, entryId])}`;
  const base = `/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/entries/${segment(entryId)}`;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; active.current?.abort(); upload.current?.cancel(); }; }, [chapterId, eventId, entryId, uid]);
  useEffect(() => {
    let alive = true;
    setSubmissionLoaded(false);
    connectedRequest<Submission | null>(`${base}/music-submission`, undefined, "GET", uid)
      .then(value => { if (alive) { setSubmission(value); setSubmissionLoaded(true); } })
      .catch(() => { if (alive) setError("Music submission status could not be loaded. Refresh this page to try again."); });
    return () => { alive = false; };
  }, [base, uid]);

  async function submit() {
    if (!saved || !savedIntent || !submissionLoaded || !editable) return;
    setBusy(true); setError("");
    try {
      const result = await registrationCommand<Submission>(`${base}/music-intents/${segment(savedIntent)}/submit`, { expected_revision: revision, expected_version: submission?.version ?? 0 }, "POST", true, uid);
      if (mounted.current) setSubmission(result);
    } catch (reason) {
      if (mounted.current) setError(reason instanceof ApiError && reason.status === 409 ? "The entry or music submission changed. Refresh this page before retrying." : reason instanceof Error ? reason.message : "The submission could not be confirmed. Try again.");
    } finally { if (mounted.current) setBusy(false); }
  }

  async function save() {
    setError(""); setSaved(null); setResult(null); setProgress(0);
    if (!file || file.size === 0 || file.size > maximumBytes) { setError("Choose a non-empty WAV or MP3 file no larger than 25 MiB."); return; }
    if (!navigator.onLine) { setError("Connect to the internet to save your track."); return; }
    if (!crypto.subtle || !crypto.randomUUID) { setError("A secure browser connection is required to save your track."); return; }
    setBusy(true);
    try {
      const auth = firebaseClient().auth;
      await auth.authStateReady();
      if (auth.currentUser?.uid !== uid) throw new Error("Your session changed. Sign in again.");
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())), byte => byte.toString(16).padStart(2, "0")).join("");
      if (!mounted.current) return;
      let recovery: Recovery | null = null;
      try { const value = sessionStorage.getItem(storageKey); if (value) recovery = JSON.parse(value) as Recovery; } catch { throw new Error("Browser session storage is unavailable. Enable it to safely resume this upload."); }
      if (!recovery || recovery.digest !== digest || recovery.size !== file.size || typeof recovery.operationId !== "string" || !Number.isSafeInteger(recovery.expectedRevision)) {
        recovery = { operationId: crypto.randomUUID(), expectedRevision: revision, digest, size: file.size };
      }
      // Save the operation before requesting an intent so a lost response can be retried.
      sessionStorage.setItem(storageKey, JSON.stringify(recovery));
      const intent = await connectedRequest<Intent>(`${base}/music-intents`, { operation_id: recovery.operationId, expected_revision: recovery.expectedRevision }, "POST", uid);
      if (!mounted.current) return;
      if (intent.chapter_id !== chapterId || intent.event_id !== eventId || intent.entry_id !== entryId || intent.owner_uid !== uid || intent.entry_revision !== recovery.expectedRevision || !/^[a-f0-9]{64}$/.test(intent.intent_id) || intent.storage_path !== `chapters/${chapterId}/music/${uid}/${intent.intent_id}/track`) throw new Error("The upload reference could not be verified.");
      recovery.intent = intent; sessionStorage.setItem(storageKey, JSON.stringify(recovery));
      if (auth.currentUser?.uid !== uid) throw new Error("Your session changed. Sign in again.");
      const object = ref(firebaseClient().storage, intent.storage_path);
      let exists = false;
      try {
        const metadata = await getMetadata(object);
        if (metadata.size !== file.size) { sessionStorage.removeItem(storageKey); throw new Error("A different file was already saved for this upload. Try again to start a new upload."); }
        exists = true;
      } catch (reason) {
        if (!(typeof reason === "object" && reason !== null && "code" in reason && reason.code === "storage/object-not-found")) throw reason;
      }
      if (!mounted.current) return;
      if (!exists) {
        if (Date.now() >= intent.expires_at * 1000) { sessionStorage.removeItem(storageKey); throw new Error("This upload reference expired. Try saving the file again to start a new upload."); }
        const task = uploadBytesResumable(object, file, { contentType: contentTypeFor(file) }); upload.current = task;
        await new Promise<void>((resolve, reject) => task.on("state_changed", snapshot => { if (mounted.current) setProgress(Math.round(100 * snapshot.bytesTransferred / snapshot.totalBytes)); }, reject, resolve));
        upload.current = null;
      }
      if (auth.currentUser?.uid !== uid) throw new Error("Your session changed. Sign in again.");
      const data = await connectedRequest<SavedInspection>(`${base}/music-intents/${segment(intent.intent_id)}/inspect`, undefined, "POST", uid, true);
      if (!(data.format === "wav" || data.format === "mp3") || !(data.content_type === "audio/wav" || data.content_type === "audio/mpeg") || data.saved !== true || data.approved !== false || !Number.isSafeInteger(data.duration_ms) || data.duration_ms <= 0) throw new Error("The inspection response could not be verified. Try again.");
      if (data.sha256 !== digest) { sessionStorage.removeItem(storageKey); throw new Error("The saved file did not match your selection. Try again to start a new upload."); }
      if (mounted.current && auth.currentUser?.uid === uid) { setSavedIntent(intent.intent_id); setSaved(data); }
    } catch (reason) {
      if (mounted.current && reason instanceof ApiError && reason.status === 409) sessionStorage.removeItem(storageKey);
      if (mounted.current) setError(reason instanceof ApiError && reason.status === 422 ? "The saved file failed its format or safety scan. Choose a different file." : reason instanceof ApiError && reason.status === 503 ? "File safety scanning is unavailable, so the file was not accepted. Try again later." : reason instanceof ApiError && reason.status === 409 ? "The entry or saved inspection changed. Refresh the entry before trying again." : reason instanceof Error ? reason.message : "The upload could not be confirmed. Re-select the same file and try again.");
    } finally { if (mounted.current) setBusy(false); }
  }

  async function inspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null); setSaved(null); setError("");
    if (!file) { setError("Choose a WAV or MP3 file first."); return; }
    if (file.size > maximumBytes) { setError("Choose a WAV or MP3 file no larger than 25 MiB."); return; }
    if (!navigator.onLine) { setError("Connect to the internet to inspect this file."); return; }
    const controller = new AbortController(); active.current = controller; setBusy(true);
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 60000);
    try {
      const auth = firebaseClient().auth;
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user || user.uid !== uid) throw new Error("Your session changed. Sign in again.");
      const token = await apiToken(user);
      const path = `/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/entries/${segment(entryId)}/audio-inspect`;
      const contentType = contentTypeFor(file);
      const response = await fetch(`${apiBase}${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType }, body: file, cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 422 ? "This file failed its format or safety scan." : response.status === 413 ? "The file is larger than the inspection limit." : response.status === 503 ? "File safety scanning is unavailable. Try again later." : response.status === 401 ? "Your session expired. Sign in again." : response.status === 403 ? "You no longer have access to inspect this entry." : "Inspection could not be completed. Check your connection and try again.");
      const data = await response.json() as Inspection;
      if (!(data.format === "wav" || data.format === "mp3") || data.content_type !== contentType || data.saved !== false || !Number.isSafeInteger(data.duration_ms) || data.duration_ms <= 0) throw new Error("The inspection response could not be verified.");
      if (!controller.signal.aborted && firebaseClient().auth.currentUser?.uid === uid) setResult(data);
    } catch (reason) {
      if (timedOut) setError("The inspection timed out. Check your connection and try again.");
      else if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Inspection could not be completed.");
    } finally {
      window.clearTimeout(timeout);
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  }

  return <section className="panel" aria-labelledby="audio-inspect-heading">
    <h2 id="audio-inspect-heading">Music file</h2>
    <p>Check or privately save a PCM or float WAV, or MP3 file up to 25 MiB, then submit it for review. Submission does not approve the track or change entry readiness.</p>
    {submissionLoaded && <p role="status">Music submission: {submission ? submission.status.replaceAll("_", " ") : "none submitted"}.</p>}
    {submission?.review_note && <p>Review note: {submission.review_note}</p>}
    <form onSubmit={inspect}>
      <label htmlFor="audio-inspect-file">WAV or MP3 file</label>
      <input id="audio-inspect-file" type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" disabled={busy} onChange={event => { setFile(event.target.files?.[0] ?? null); setResult(null); setSaved(null); setError(""); }} />
      <button className="button button-outline" type="submit" disabled={busy || !file}>{busy ? "Working…" : "Check file"}</button>
      <button className="button button-volt" type="button" disabled={busy || !file || !editable} onClick={() => void save()}>Save and inspect</button>
    </form>
    {!editable && <p>Saving is available while this entry is a draft or needs correction.</p>}
    {busy && progress > 0 && <p role="status">Uploading: {progress}%</p>}
    <p className="fineprint">If interrupted, reselect the same file in this tab and try again.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    {result && <p role="status">Measured {result.format.toUpperCase()} duration: {(result.duration_ms / 1000).toFixed(3)} seconds. {result.channels} channel(s), {result.sample_rate} Hz. The file was not saved or submitted.</p>}
    {saved && <><p role="status">{saved.format.toUpperCase()} saved and inspected: {(saved.duration_ms / 1000).toFixed(3)} seconds, {saved.channels} channel(s), {saved.sample_rate} Hz. {submission?.intent_id === savedIntent ? `Submitted; ${submission.status.replaceAll("_", " ")}.` : "This file has not been submitted."}</p><button className="button button-volt" type="button" disabled={busy || !submissionLoaded || !editable || (submission?.intent_id === savedIntent && submission.status !== "needs_correction")} onClick={() => void submit()}>Submit saved file for review</button></>}
  </section>;
}
