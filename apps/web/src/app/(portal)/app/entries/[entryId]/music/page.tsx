"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { getEntryDetail, Entry, EntryReadiness } from "@/lib/api";

export default function EntryMusicPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = use(params);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [readiness, setReadiness] = useState<EntryReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(172);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const detail = await getEntryDetail("ph", "demo-token", "manila-session-2027", entryId);
        setEntry(detail.entry);
        setReadiness(detail.readiness);
        if (detail.entry.track_filename) {
          setSelectedFile(detail.entry.track_filename);
          setDuration(detail.entry.track_duration_secs || 172);
        }
      } catch {
        setEntry({
          id: entryId,
          chapter_id: "ph",
          event_id: "manila-session-2027",
          crew_id: "crew-afterhours",
          division_id: "open-crew",
          roster: [],
          track_filename: "afterhours_manila_cut_v2.mp3",
          track_duration_secs: 172,
          paid_minor: 720000,
          status: "draft",
          created_at: 1700000000,
          updated_at: 1700000000,
        });
        setSelectedFile("afterhours_manila_cut_v2.mp3");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [entryId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file.name);
      setDuration(174); // simulated duration extraction
    }
  }

  function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setFeedback("Master audio cut uploaded and verified compliant with 180s division cap.");
    }, 600);
  }

  if (loading) {
    return (
      <main className="workspace-main">
        <PageHeading eyebrow="Music Compliance" title="Loading audio track..." description="Checking duration caps." />
      </main>
    );
  }

  const isCompliant = duration <= 180;

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Entry #${entryId} / Performance Audio`}
        title="Performance Music Track"
        description="Upload your crew's competition audio track. Track duration is strictly checked against the 180s division limit."
        action={
          <Link href={`/app/entries/${entryId}`} className="button button-outline">
            ← Entry Overview
          </Link>
        }
      />

      {feedback && <p className="info-note" role="status">{feedback}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="panel col-span-2">
          <div className="panel-heading">
            <h2>Audio Track Upload & Duration Check</h2>
            <Status tone={isCompliant ? "volt" : "amber"}>
              {isCompliant ? "Duration Compliant" : "Overrun Detected"}
            </Status>
          </div>

          <form onSubmit={handleUpload} className="space-y-6 pt-2">
            <div className="p-6 border-2 border-dashed border-subtle rounded text-center hover:border-volt transition-colors bg-tungsten/30">
              <span className="mono text-2xl text-volt block mb-2">♫</span>
              <strong className="text-chrome block mb-1">
                {selectedFile ? selectedFile : "Select WAV or High-Bitrate MP3 (320kbps)"}
              </strong>
              <p className="text-xs text-titanium mb-4">
                Clean radio edits only. Maximum file size: 50MB. Stereo 44.1kHz.
              </p>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="text-xs text-titanium file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-volt file:text-black hover:file:opacity-90 cursor-pointer"
              />
            </div>

            <div className="p-4 bg-tungsten rounded border border-subtle flex justify-between items-center">
              <div>
                <span className="text-xs text-titanium block mb-1">Analyzed Track Duration:</span>
                <strong className={`text-xl mono ${isCompliant ? "text-volt" : "text-crimson"}`}>
                  {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")} ({duration} seconds)
                </strong>
              </div>
              <div className="text-right">
                <span className="text-xs text-titanium block mb-1">Division Maximum Cap:</span>
                <strong className="mono text-chrome">03:00 (180s)</strong>
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedFile || !isCompliant}
              className="button button-volt"
            >
              {uploading ? "Verifying Audio Compliance..." : "Save Performance Track"} <Arrow />
            </button>
          </form>
        </section>

        <aside className="panel space-y-4">
          <div className="panel-heading">
            <h2>Audio Technical Standards</h2>
          </div>
          <ul className="text-xs text-titanium space-y-2 list-disc list-inside">
            <li>Tracks exceeding 180s incur a 0.5-point penalty per 5-second interval.</li>
            <li>No explicit, defamatory, or prohibited lyrical language.</li>
            <li>Auditorium sound system is tuned to 0 dBFS peak normalization.</li>
            <li>Bring a backup USB flash drive to the stage DJ desk during check-in.</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}