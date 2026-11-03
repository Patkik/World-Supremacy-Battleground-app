"use client";

import { useEffect, useRef, useState } from "react";
import { apiBase, ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { firebaseClient } from "@/lib/firebase/client";
import { apiToken } from "@/lib/firebase/api-session";
import { registrationCommand } from "@/lib/registration-command";

type Submission = { version: number; status: string; duration_ms: number; format: "wav" | "mp3"; content_type: "audio/wav" | "audio/mpeg"; review_note: string | null };

export function MusicReview({ chapterId, eventId, entryId, uid, onSavedDecision }: { chapterId: string; eventId: string; entryId: string; uid: string; onSavedDecision?: () => void }) {
  const root = `/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/entries/${segment(entryId)}/music-submission`;
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [audio, setAudio] = useState("");
  const [note, setNote] = useState("");
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    connectedRequest<Submission | null>(root, undefined, "GET", uid)
      .then(value => { if (mounted.current) setSubmission(value); })
      .catch(() => { if (mounted.current) setError("Music submission could not be loaded. Refresh and try again."); })
      .finally(() => { if (mounted.current) setLoading(false); });
    return () => { mounted.current = false; active.current?.abort(); };
  }, [root, uid]);
  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio); }, [audio]);

  async function loadAudio() {
    setError(""); setBusy(true);
    const controller = new AbortController(); active.current = controller;
    try {
      const auth = firebaseClient().auth; await auth.authStateReady();
      if (!auth.currentUser || auth.currentUser.uid !== uid) throw new Error("Your session changed. Sign in again.");
      const token = await apiToken(auth.currentUser);
      const response = await fetch(`${apiBase}${root}/audio`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 403 ? "You no longer have access to this track." : response.status === 409 ? "The submitted track changed. Refresh this page." : "The track could not be opened. Try again.");
      const blob = await response.blob();
      if (blob.size === 0 || blob.size > 25 * 1024 * 1024 || !submission || blob.type !== submission.content_type || (submission.format === "wav" && submission.content_type !== "audio/wav") || (submission.format === "mp3" && submission.content_type !== "audio/mpeg")) throw new Error("The track response could not be verified.");
      if (!controller.signal.aborted && mounted.current && auth.currentUser?.uid === uid) setAudio(URL.createObjectURL(blob));
    } catch (reason) {
      if (!controller.signal.aborted && mounted.current) setError(reason instanceof Error ? reason.message : "The track could not be opened.");
    } finally { if (mounted.current) setBusy(false); }
  }

  async function review(decision: "reviewed" | "needs_correction") {
    if (!submission || !audio) return;
    if (decision === "needs_correction" && !note.trim()) { setError("Add a note explaining what needs correction."); return; }
    setBusy(true); setError("");
    try {
      await registrationCommand<Submission>(`${root}/review`, { expected_version: submission.version, decision, note: note.trim() }, "POST", false, uid);
      const current = await connectedRequest<Submission | null>(root, undefined, "GET", uid);
      if (mounted.current) { setSubmission(current); onSavedDecision?.(); }
    } catch (reason) {
      if (mounted.current) setError(reason instanceof ApiError && reason.status === 409 ? "The submitted track or review changed. Refresh this page." : reason instanceof Error ? reason.message : "The review could not be recorded. Try again.");
    } finally { if (mounted.current) setBusy(false); }
  }

  return <section className="panel" aria-labelledby="music-review-heading">
    <h2 id="music-review-heading">Submitted music</h2>
    {loading ? <p role="status">Loading music submission…</p> : submission ? <>
      <p>Status: {submission.status.replaceAll("_", " ")}. {submission.format.toUpperCase()} measured duration: {(submission.duration_ms / 1000).toFixed(3)} seconds.</p>
      <button type="button" className="button button-outline" disabled={busy} onClick={() => void loadAudio()}>{busy ? "Opening track…" : "Open submitted track"}</button>
      {audio && <audio controls src={audio} aria-label="Submitted music track" />}
      {submission.review_note && <p>Review note: {submission.review_note}</p>}
      {submission.status === "pending_review" && <><label htmlFor="music-review-note">Review note (required when requesting correction)</label><textarea id="music-review-note" maxLength={500} value={note} onChange={event => setNote(event.target.value)} disabled={busy} /><div className="connected-actions"><button type="button" className="button button-volt" disabled={busy || !audio} onClick={() => void review("reviewed")}>Mark as reviewed</button><button type="button" className="button button-outline" disabled={busy || !audio} onClick={() => void review("needs_correction")}>Request music correction</button></div></>}
      <p className="fineprint">Review records a manual outcome. It does not approve event compliance or change entry readiness.</p>
    </> : !error && <p>No music has been submitted for this entry.</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </section>;
}
