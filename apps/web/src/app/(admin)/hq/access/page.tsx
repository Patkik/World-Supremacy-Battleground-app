"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

interface UserAccessItem {
  id: string;
  name: string;
  email: string;
  role: string;
  scope: string;
  mfa: string;
  status: string;
  tone: "volt" | "amber" | "crimson" | "neutral";
}

export default function GlobalAccessGovernancePage() {
  const [users, setUsers] = useState<UserAccessItem[]>([
    {
      id: "usr-root-01",
      name: "Marco Selorio",
      email: "marco.selorio@wsbchampionships.com",
      role: "Super Administrator",
      scope: "Global (All Chapters)",
      mfa: "WebAuthn Hardware Key",
      status: "Active",
      tone: "volt",
    },
    {
      id: "usr-scrut-01",
      name: "Dr. Alistair Finch",
      email: "scrutineer@wsbchampionships.com",
      role: "Chief Global Scrutineer",
      scope: "Global (Scoring & Audits)",
      mfa: "TOTP Authenticator",
      status: "Active",
      tone: "volt",
    },
    {
      id: "usr-dir-ph",
      name: "Marcus Vance",
      email: "director.ph@wsbchampionships.com",
      role: "Chapter Director",
      scope: "Philippines (Chapter #ph)",
      mfa: "WebAuthn Hardware Key",
      status: "Active",
      tone: "volt",
    },
    {
      id: "usr-judge-head",
      name: "Ken Swift",
      email: "headjudge.swift@wsb.com",
      role: "Head Judge",
      scope: "Event #event-manila-session-2027",
      mfa: "TOTP Authenticator",
      status: "Active",
      tone: "volt",
    },
  ]);

  const handleRevoke = (id: string, name: string) => {
    if (!confirm(`Revoke session credentials and invalidate JWT tokens for ${name}?`)) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: "Revoked", tone: "crimson" as const } : u))
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Security & Role-Based Access Control"
          title="Global Identity & Access Governance"
          description="Govern administrative permissions, enforce mandatory hardware multi-factor authentication, and monitor cross-chapter tenant isolation."
        />
        <div className="flex gap-2">
          <Link href="/hq" className="button button-secondary" style={{ minHeight: "48px" }}>
            HQ Overview <Arrow diagonal />
          </Link>
          <Button
            variant="primary"
            onClick={() => alert("Opening Global Staff Provisioning Modal...")}
            style={{ minHeight: "48px" }}
          >
            Grant New Staff Access
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Global Staff" value={users.length.toString()} meta="Administrative accounts" tone="volt" />
        <StatCard label="MFA Compliance" value="100%" meta="FIDO2 / TOTP Enforced" tone="volt" />
        <StatCard label="Tenant Boundary" value="Enforced" meta="Zero cross-chapter leakage" tone="volt" />
        <StatCard label="Token Revocation" value="Instant" meta="Blacklist distributed" />
      </div>

      <div className="panel bg-carbon border border-subtle overflow-x-auto rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-subtle text-xs mono text-titanium">
              <th className="p-4">User</th>
              <th className="p-4">Assigned Role</th>
              <th className="p-4">Territorial Scope</th>
              <th className="p-4">MFA Credential</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-subtle/30 transition-colors">
                <td className="p-4">
                  <strong className="block text-chrome">{u.name}</strong>
                  <span className="mono text-xs text-titanium">{u.email}</span>
                </td>
                <td className="p-4 mono text-xs font-bold text-volt">{u.role}</td>
                <td className="p-4 text-xs text-titanium">{u.scope}</td>
                <td className="p-4 mono text-xs text-titanium">{u.mfa}</td>
                <td className="p-4">
                  <Status tone={u.tone}>{u.status}</Status>
                </td>
                <td className="p-4 text-right">
                  {u.status !== "Revoked" ? (
                    <button
                      onClick={() => handleRevoke(u.id, u.name)}
                      className="button button-ghost text-crimson text-xs hover:bg-crimson/10"
                    >
                      Revoke Tokens
                    </button>
                  ) : (
                    <span className="mono text-xs text-crimson">Revoked</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
