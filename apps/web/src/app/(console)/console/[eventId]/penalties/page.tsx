"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, Select, Textarea } from "@/components/ui";

export default function TechnicalDeductionsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const [selectedEntry, setSelectedEntry] = useState("012");
  const [penaltyType, setPenaltyType] = useState("time");
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const entries = [
    { number: "012", crew: "Legion X", division: "Open Crew" },
    { number: "014", crew: "Afterhours Collective", division: "Open Crew" },
    { number: "015", crew: "Alliance Project", division: "Open Crew" },
    { number: "016", crew: "FMD Xtreme", division: "Monster Crew" },
  ];

  const penaltyRules = {
    time: { label: "Time Limit Overrun (-0.5 pts / 10s)", deduction: -0.5 },
    prop: { label: "Unauthorized Floor Prop / Cleanup Delay (-1.0 pt)", deduction: -1.0 },
    language: { label: "Explicit Lyric / Attire / Gesture Infraction (-2.0 pts)", deduction: -2.0 },
    substitute: { label: "Unregistered Dancer on Stage (-5.0 pts)", deduction: -5.0 },
    delay: { label: "Delay of Game / False Floor Start (-0.5 pt)", deduction: -0.5 },
  };

  const [penaltyLog, setPenaltyLog] = useState([
    {
      id: "pen-1",
      entry: "012",
      crew: "Legion X",
      rule: "Time Limit Overrun",
      points: -0.5,
      timestamp: "14:22:10",
      judge: "Lando Wilkins (TJ)",
      rationale: "Routine audio cut off at 2m38s (rule ceiling 2m30s).",
    },
  ]);

  const handleSubmitPenalty = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      const rule = penaltyRules[penaltyType as keyof typeof penaltyRules];
      const entryObj = entries.find((e) => e.number === selectedEntry);
      const newPenalty = {
        id: `pen-${Date.now()}`,
        entry: selectedEntry,
        crew: entryObj ? entryObj.crew : selectedEntry,
        rule: rule.label.split(" (")[0],
        points: rule.deduction,
        timestamp: new Date().toLocaleTimeString(),
        judge: "Head / Technical Desk",
        rationale: rationale || "Routine compliance violation confirmed by floor camera.",
      };
      setPenaltyLog([newPenalty, ...penaltyLog]);
      setSubmitting(false);
      setSuccessMsg(`Penalty of ${rule.deduction} pts applied to Entry ${selectedEntry}`);
      setRationale("");
      setTimeout(() => setSuccessMsg(""), 4000);
    }, 500);
  };

  return (
    <div className="judge-shell">
      <header className="judge-header">
        <Brand />
        <div className="judge-event">
          <strong>Technical Deductions Desk</strong>
          <span>Event Desk #{eventId} · Rule Compliance Engine</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/console/${eventId}/head-judge`} className="text-link">
            Head Judge Overview <Arrow diagonal />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <PageHeading
          eyebrow="Rule Book Enforcement"
          title="Technical Penalty Logger"
          description="Assess official WSB deductions according to technical timing, prop rules, and lyric guidelines. Deductions subtract directly from aggregate score."
        />

        {successMsg && (
          <div className="panel p-4 bg-volt/10 border border-volt text-chrome rounded">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="panel p-6 bg-carbon border border-subtle space-y-6">
            <h2 className="text-xl font-bold text-chrome">Issue Technical Deduction</h2>
            <form onSubmit={handleSubmitPenalty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-titanium mb-2">Select Routine / Entry</label>
                <Select
                  value={selectedEntry}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedEntry(e.target.value)}
                  style={{ minHeight: "48px" }}
                >
                  {entries.map((entry) => (
                    <option key={entry.number} value={entry.number}>
                      Entry #{entry.number} - {entry.crew} ({entry.division})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-titanium mb-2">Deduction Rule Category</label>
                <Select
                  value={penaltyType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPenaltyType(e.target.value)}
                  style={{ minHeight: "48px" }}
                >
                  {Object.entries(penaltyRules).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-titanium mb-2">
                  Official Justification & Timestamp Note
                </label>
                <Textarea
                  value={rationale}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRationale(e.target.value)}
                  placeholder="e.g. Official timekeeper clock stopped at 2:38; 8s overtime incurred."
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                variant="danger"
                disabled={submitting}
                className="w-full"
                style={{ minHeight: "48px" }}
              >
                {submitting ? "Writing to Audit Ledger..." : "Apply Authoritative Deduction"}
              </Button>
            </form>
          </section>

          <section className="panel p-6 bg-carbon border border-subtle space-y-6">
            <h2 className="text-xl font-bold text-chrome">Active Deductions Ledger</h2>
            {penaltyLog.length === 0 ? (
              <p className="text-titanium text-sm">No penalties assessed for this session.</p>
            ) : (
              <div className="space-y-4">
                {penaltyLog.map((pen) => (
                  <div key={pen.id} className="p-4 bg-obsidian border border-subtle rounded space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="mono text-xs text-titanium">Entry #{pen.entry}</span>
                        <h4 className="font-bold text-chrome">{pen.crew}</h4>
                      </div>
                      <span className="mono font-bold text-lg text-crimson">{pen.points.toFixed(1)} pts</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Status tone="amber">{pen.rule}</Status>
                      <span className="text-titanium">{pen.timestamp}</span>
                      <span className="text-titanium">by {pen.judge}</span>
                    </div>
                    <p className="text-xs text-muted italic">"{pen.rationale}"</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
