"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, Select, Input, Textarea, StatCard } from "@/components/ui";

export default function EventIncidentLogPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const [category, setCategory] = useState("Audio/Technical");
  const [severity, setSeverity] = useState("Medium");
  const [location, setLocation] = useState("Main Stage");
  const [description, setDescription] = useState("");
  const [mitigation, setMitigation] = useState("");

  const [incidents, setIncidents] = useState<{
    id: string;
    timestamp: string;
    category: string;
    severity: string;
    location: string;
    description: string;
    mitigation: string;
    owner: string;
    status: string;
    tone: "neutral" | "volt" | "amber" | "crimson";
  }[]>([
    {
      id: "INC-2027-01",
      timestamp: "13:45",
      category: "Audio/Technical",
      severity: "Medium",
      location: "Main Stage",
      description: "Brief stage monitor feedback loop during warm-up round.",
      mitigation: "Acoustic tech notched 3.2kHz on aux send 2. Resolved.",
      owner: "Sound Lead (Alex)",
      status: "Closed",
      tone: "neutral",
    },
    {
      id: "INC-2027-02",
      timestamp: "14:15",
      category: "Medical / Injury",
      severity: "Low",
      location: "Warm-up Studio B",
      description: "Dancer minor ankle twist during acrobatic stretch.",
      mitigation: "On-site EMT applied compression ice pack. Cleared for routine.",
      owner: "Medical Team",
      status: "Mitigated",
      tone: "amber",
    },
  ]);

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    const newInc = {
      id: `INC-2027-0${incidents.length + 1}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      category,
      severity,
      location,
      description,
      mitigation: mitigation || "Under investigation by stage manager.",
      owner: "Floor Duty Staff",
      status: "Open",
      tone: severity === "Critical" ? ("crimson" as const) : ("amber" as const),
    };
    setIncidents([newInc, ...incidents]);
    setDescription("");
    setMitigation("");
  };

  return (
    <div className="judge-shell">
      <header className="judge-header">
        <Brand />
        <div className="judge-event">
          <strong>Event Operations & Incident Desk</strong>
          <span>Event Desk #{eventId} · Production Safety</span>
        </div>
        <Link href="/console" className="text-link">
          Console Hub <Arrow diagonal />
        </Link>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <PageHeading
          eyebrow="Stage Safety & Operational Audit"
          title="Event Incident Log & Escalation"
          description="Log and escalate technical glitches, physical floor hazards, or medical triage. Note: operational notes never directly mutate official scoring ledgers."
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Logged" value={incidents.length.toString()} meta="Session to date" />
          <StatCard label="Open / Mitigating" value={incidents.filter(i => i.status !== "Closed").length.toString()} meta="Requires monitoring" tone="amber" />
          <StatCard label="Stage Clear" value="Yes" meta="Flooring inspected" tone="volt" />
          <StatCard label="First Aid Post" value="Active" meta="2 Medics on duty" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="panel p-6 bg-carbon border border-subtle space-y-4 lg:col-span-1">
            <h2 className="text-xl font-bold text-chrome">Record Incident</h2>
            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-titanium mb-1">Category</label>
                <Select value={category} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)} style={{ minHeight: "44px" }}>
                  <option value="Audio/Technical">Audio / Technical</option>
                  <option value="Medical / Injury">Medical / First Aid</option>
                  <option value="Floor / Prop Obstacle">Floor / Prop Obstacle</option>
                  <option value="Security / Crowd">Security / Crowd</option>
                  <option value="Schedule Delay">Schedule Delay</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-titanium mb-1">Severity</label>
                <Select value={severity} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSeverity(e.target.value)} style={{ minHeight: "44px" }}>
                  <option value="Low">Low - Informational</option>
                  <option value="Medium">Medium - Requires Action</option>
                  <option value="Critical">Critical - Floor Stop Required</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-titanium mb-1">Location</label>
                <Input value={location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)} style={{ minHeight: "44px" }} />
              </div>

              <div>
                <label className="block text-xs font-medium text-titanium mb-1">Incident Detail</label>
                <Textarea
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  placeholder="Detail the issue factually..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-titanium mb-1">Mitigation Plan</label>
                <Textarea
                  value={mitigation}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMitigation(e.target.value)}
                  placeholder="Steps taken to resolve..."
                  rows={2}
                />
              </div>

              <Button type="submit" variant="primary" className="w-full" style={{ minHeight: "48px" }}>
                Submit Incident Entry
              </Button>
            </form>
          </section>

          <section className="panel p-6 bg-carbon border border-subtle space-y-4 lg:col-span-2">
            <h2 className="text-xl font-bold text-chrome">Active Incident Timeline</h2>
            <div className="space-y-4">
              {incidents.map((inc) => (
                <div key={inc.id} className="p-4 bg-obsidian border border-subtle rounded space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="mono text-xs text-white">{inc.id}</span>
                        <Status tone={inc.tone}>{inc.status}</Status>
                        <span className="text-xs text-titanium">({inc.severity} Severity)</span>
                      </div>
                      <h4 className="font-bold text-chrome">{inc.category} · {inc.location}</h4>
                    </div>
                    <span className="mono text-xs text-titanium">{inc.timestamp}</span>
                  </div>
                  <p className="text-sm text-titanium">{inc.description}</p>
                  <p className="text-xs text-volt font-medium">Mitigation: {inc.mitigation}</p>
                  <div className="text-xs text-muted pt-2 border-t border-subtle flex justify-between">
                    <span>Handler: {inc.owner}</span>
                    <span>Immutable Audit Log</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
