"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function StaffManagementPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);

  const staff = [
    {
      id: "staff-1",
      name: "Marco Valderrama",
      email: "director.ph@worldsupremacybattlegrounds.com",
      role: "Chapter Director",
      scope: "All Events",
      status: "Active",
    },
    {
      id: "staff-2",
      name: "Carla Mendoza",
      email: "registrar.ph@worldsupremacybattlegrounds.com",
      role: "Lead Registrar",
      scope: "Manila Session 2027",
      status: "Active",
    },
    {
      id: "staff-3",
      name: "Dominic Torres",
      email: "stage.ph@worldsupremacybattlegrounds.com",
      role: "Stage Manager",
      scope: "Manila Session 2027",
      status: "Active",
    },
    {
      id: "staff-4",
      name: "Ezekiel 'Zeke' Cruz",
      email: "headjudge.ph@worldsupremacybattlegrounds.com",
      role: "Head Judge",
      scope: "Open Crew / Monster Crew",
      status: "Active",
    },
  ];

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Chapter Command / ${chapterId.toUpperCase()}`}
        title="Staff & Official Assignments"
        description="Manage official credentials, stage roles, judging accreditation, and administrative privileges."
        action={
          <button onClick={() => alert("Staff invitations require Chapter Director approval.")} className="button button-volt">
            + Assign Staff Member <Arrow />
          </button>
        }
      />

      <section className="panel roster-panel">
        <div className="panel-heading">
          <div>
            <h2>Accredited Chapter Officials</h2>
            <p>Active staff assignments for {chapterId.toUpperCase()} operations</p>
          </div>
          <span className="mono text-volt font-bold">{staff.length} Officials</span>
        </div>

        <div className="roster-table">
          <div className="roster-header">
            <span>Name & Email</span>
            <span>Official Role</span>
            <span>Assigned Scope</span>
            <span>Status</span>
          </div>
          {staff.map((s) => (
            <div className="roster-record" key={s.id}>
              <div>
                <strong>{s.name}</strong>
                <span className="mono text-xs text-muted block">{s.email}</span>
              </div>
              <span className="text-sm text-chrome font-semibold">{s.role}</span>
              <span className="text-sm text-titanium">{s.scope}</span>
              <Status tone="volt">{s.status}</Status>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 p-4 rounded bg-carbon border border-subtle">
        <h3 className="font-bold text-chrome text-sm mb-1">Role-Based Access Control (RBAC)</h3>
        <p className="text-xs text-titanium leading-relaxed">
          Staff assignments are synchronized to Firebase Authentication custom claims. Registrars possess waiver sign-off privileges,
          Head Judges hold division scoring lock controls, and Chapter Directors retain event publishing authority.
        </p>
      </div>
    </main>
  );
}