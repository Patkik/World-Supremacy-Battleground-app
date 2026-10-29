"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function DependentsPage() {
  const [dependents, setDependents] = useState([
    {
      id: "dep-1",
      name: "Carlo Lim",
      birthDate: "2013-05-14",
      relationship: "Parent",
      waiverStatus: "Verified",
      crew: "Afterhours Collective",
    },
  ]);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [relationship, setRelationship] = useState("Parent");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setDependents([
      ...dependents,
      {
        id: `dep-${Date.now()}`,
        name,
        birthDate,
        relationship,
        waiverStatus: "Pending Signature",
        crew: "Unassigned",
      },
    ]);
    setShowAdd(false);
    setName("");
    setBirthDate("");
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow="Youth Division Safeguards"
        title="Guardian Dependents"
        description="Link minor dancers to your parent or legal guardian account to authorize championship entry waivers."
        action={
          <button onClick={() => setShowAdd(true)} className="button button-volt">
            + Link Minor Dancer <Arrow />
          </button>
        }
      />

      {showAdd && (
        <section className="panel mb-6 max-w-xl">
          <div className="panel-heading">
            <h2>Link Dependent Dancer</h2>
          </div>
          <form onSubmit={handleAdd} className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-semibold text-chrome mb-1">Dancer Legal Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Legal Relationship</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                >
                  <option value="Parent">Parent</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                  <option value="Authorized Chaperone">Authorized Chaperone</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="button button-outline text-xs">
                Cancel
              </button>
              <button type="submit" className="button button-volt text-xs">
                Link & Authorize <Arrow />
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel roster-panel">
        <div className="panel-heading">
          <div>
            <h2>Registered Minor Dependents</h2>
            <p>Parental consent and age credentials bound to your profile</p>
          </div>
        </div>

        <div className="roster-table">
          <div className="roster-header">
            <span>Dancer Name</span>
            <span>Date of Birth</span>
            <span>Relationship</span>
            <span>Crew Assignment</span>
            <span>Guardian Release</span>
          </div>
          {dependents.map((d) => (
            <div className="roster-record" key={d.id}>
              <div>
                <strong>{d.name}</strong>
                <span className="mono text-xs text-muted block">{d.id}</span>
              </div>
              <span className="mono text-sm">{d.birthDate}</span>
              <span className="text-sm text-titanium">{d.relationship}</span>
              <span className="text-sm text-chrome">{d.crew}</span>
              <Status tone={d.waiverStatus === "Verified" ? "volt" : "amber"}>
                {d.waiverStatus}
              </Status>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}