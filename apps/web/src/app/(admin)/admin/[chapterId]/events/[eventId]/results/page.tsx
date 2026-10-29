"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function AdminEventResultsPublicationPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = use(params);

  const [divisions, setDivisions] = useState([
    {
      id: "open-crew",
      name: "Open Crew Division",
      headJudgeLocked: true,
      published: true,
      publishTime: "15:10 PHT",
      entriesCount: 18,
      winner: "Afterhours Collective (88.33)",
      hash: "0x8F91...22A",
    },
    {
      id: "monster-crew",
      name: "Monster Crew Division",
      headJudgeLocked: true,
      published: false,
      publishTime: null,
      entriesCount: 12,
      winner: "FMD Xtreme (89.15)",
      hash: "0x3A12...89E",
    },
    {
      id: "young-guns",
      name: "Young Guns Division",
      headJudgeLocked: false,
      published: false,
      publishTime: null,
      entriesCount: 14,
      winner: "Pending Head Judge",
      hash: "Pending",
    },
  ]);

  const [feedbackMsg, setFeedbackMsg] = useState("");

  const handlePublish = (divId: string) => {
    setDivisions((prev) =>
      prev.map((d) =>
        d.id === divId
          ? { ...d, published: true, publishTime: new Date().toLocaleTimeString() }
          : d
      )
    );
    setFeedbackMsg(`Division ${divId} pushed live to Public Results & Arena LED!`);
    setTimeout(() => setFeedbackMsg(""), 4000);
  };

  const handleRollback = (divId: string) => {
    const reason = prompt("Enter official reason for emergency rollback (e.g. Scrutineer audit review):");
    if (!reason) return;
    setDivisions((prev) =>
      prev.map((d) =>
        d.id === divId ? { ...d, published: false, publishTime: null } : d
      )
    );
    setFeedbackMsg(`Division ${divId} rolled back. Reason logged to immutable audit ledger: "${reason}"`);
    setTimeout(() => setFeedbackMsg(""), 5000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow={`Chapter / ${chapterId.toUpperCase()} / Events`}
          title="Official Results Publication & Rollback Desk"
          description={`Control authoritative public disclosure of results for Event #${eventId}. Publication immediately exposes scorecards to public views, director portals, and stadium displays.`}
        />
        <Link
          href={`/events/${eventId}/results`}
          target="_blank"
          className="button button-secondary"
          style={{ minHeight: "48px" }}
        >
          View Public Results <Arrow diagonal />
        </Link>
      </div>

      {feedbackMsg && (
        <div className="panel p-4 bg-volt/10 border border-volt text-chrome rounded">
          {feedbackMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Divisions" value={divisions.length.toString()} meta="4 Scheduled" />
        <StatCard label="Published Live" value={divisions.filter(d => d.published).length.toString()} meta="On Public & Arena" tone="volt" />
        <StatCard label="Head Judge Locked" value={divisions.filter(d => d.headJudgeLocked).length.toString()} meta="Cryptographically certified" />
        <StatCard label="Audit State" value="Authoritative" meta="Rust Axum Ledger" tone="volt" />
      </div>

      <div className="space-y-4">
        {divisions.map((div) => (
          <div
            key={div.id}
            className="panel p-6 bg-carbon border border-subtle rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-chrome">{div.name}</h3>
                <Status tone={div.published ? "volt" : div.headJudgeLocked ? "amber" : "neutral"}>
                  {div.published
                    ? `Published at ${div.publishTime}`
                    : div.headJudgeLocked
                    ? "Locked (Ready to Publish)"
                    : "Judging in Progress"}
                </Status>
              </div>
              <p className="text-sm text-titanium">
                Entries: <strong className="text-chrome mono">{div.entriesCount}</strong> · Top Projection: <strong className="text-white">{div.winner}</strong>
              </p>
              <span className="mono text-xs text-titanium block">Digest: {div.hash}</span>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {div.published ? (
                <Button
                  variant="danger"
                  onClick={() => handleRollback(div.id)}
                  style={{ minHeight: "48px" }}
                >
                  Emergency Rollback
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => handlePublish(div.id)}
                  disabled={!div.headJudgeLocked}
                  style={{ minHeight: "48px" }}
                >
                  {div.headJudgeLocked ? "Publish to Public & Arena" : "Awaiting Head Lock"}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
