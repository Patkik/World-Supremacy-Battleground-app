"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function PrivacyAndDataRequestsPage() {
  const [mediaConsent, setMediaConsent] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const handleRequestExport = () => {
    setExportRequested(true);
    setTimeout(() => {
      alert("A secure download link for your data archive (JSON + PDFs) has been dispatched to your registered email.");
    }, 400);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Data Governance & Rights"
          title="Privacy Settings & Personal Data Portal"
          description="Manage your consent preferences, export your complete digital activity archive, or request personal data erasure under global privacy standards."
        />
        <Link href="/policies/privacy" className="text-link text-xs mono">
          Full Privacy Policy <Arrow diagonal />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Privacy Standard" value="GDPR & DPA" meta="Australian Privacy Principles" tone="volt" />
        <StatCard label="Account Data" value="Encrypted" meta="At-rest & in-flight AES-256" />
        <StatCard label="Data Requests" value="0 Pending" meta="All requests fulfilled" tone="volt" />
      </div>

      {/* CONSENT PREFERENCES */}
      <section className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
        <h3 className="text-xl font-bold text-chrome">Media & Broadcast Consents</h3>
        <p className="text-sm text-titanium">
          Control how your competition performance footage and images are utilized across WSB broadcast channels.
        </p>

        <div className="space-y-4 pt-2">
          <label className="flex items-start gap-4 cursor-pointer p-4 bg-obsidian border border-subtle rounded-lg">
            <input
              type="checkbox"
              checked={mediaConsent}
              onChange={(e) => setMediaConsent(e.target.checked)}
              className="mt-1 w-5 h-5 accent-volt"
            />
            <div>
              <strong className="block text-chrome">Livestream & Broadcast Release</strong>
              <span className="text-xs text-titanium">
                Permit multi-camera streaming of routines on official WSB broadcast feeds and event highlight packages. (Required for competition eligibility).
              </span>
            </div>
          </label>

          <label className="flex items-start gap-4 cursor-pointer p-4 bg-obsidian border border-subtle rounded-lg">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-1 w-5 h-5 accent-volt"
            />
            <div>
              <strong className="block text-chrome">Event Announcements & Partner Offers</strong>
              <span className="text-xs text-titanium">
                Receive email alerts regarding upcoming season tour dates, workshop registration deadlines, and sponsor giveaways.
              </span>
            </div>
          </label>
        </div>
      </section>

      {/* DATA EXPORT & ERASURE */}
      <section className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-6">
        <div>
          <h3 className="text-xl font-bold text-chrome">Data Portability & Deletion</h3>
          <p className="text-sm text-titanium">
            Under data protection regulations, you retain full ownership of your competitive records, payment history, and profile metadata.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-obsidian border border-subtle rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <strong className="block text-chrome">Download Data Archive</strong>
              <p className="text-xs text-titanium">
                Receive an encrypted archive containing profile records, past routine scorecards, invoices, and signed consents.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleRequestExport}
              disabled={exportRequested}
              style={{ minHeight: "44px" }}
            >
              {exportRequested ? "Archive Sent to Email" : "Request Personal Archive"}
            </Button>
          </div>

          <div className="p-4 bg-obsidian border border-crimson/30 rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <strong className="block text-crimson">Account Erasure Request</strong>
              <p className="text-xs text-titanium">
                Permanently purge your account credentials and personal profile. (Official public scorecards remain anonymized).
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => alert("Erasure request submitted. You will receive a verification SMS to confirm account removal.")}
              style={{ minHeight: "44px" }}
            >
              Request Account Erasure
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
