"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("registration");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow="Participant Support"
        title="Support & Inquiries"
        description="Submit tickets directly to Chapter Administration and event technical marshals."
        action={
          <Link href="/help" className="button button-outline">
            Browse Knowledge Base <Arrow diagonal />
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Support Request Form */}
        <div className="panel col-span-2">
          <div className="panel-heading">
            <h2>{submitted ? "Ticket Transmitted" : "Open a Support Ticket"}</h2>
          </div>

          {submitted ? (
            <div className="p-6 text-center space-y-4">
              <span className="text-4xl text-volt block">✓</span>
              <h3 className="text-xl font-bold text-chrome">Ticket #WSB-8821 Created</h3>
              <p className="text-sm text-titanium max-w-md mx-auto">
                Your inquiry has been dispatched to the Philippines Chapter Operations Desk. An event marshal will respond within 4 business hours.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setSubject("");
                  setMessage("");
                }}
                className="button button-volt"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Inquiry Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                >
                  <option value="registration">Roster & Division Registration</option>
                  <option value="music">Audio Track & Music Compliance</option>
                  <option value="consent">Minor Guardian Consent Forms</option>
                  <option value="payment">Fee Invoicing & Payment Reconciliation</option>
                  <option value="other">Other Operations Question</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Minor waiver upload question for Open Crew"
                  required
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Provide complete details including your crew name and registered division..."
                  required
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                />
              </div>

              <button type="submit" className="button button-volt">
                Submit Support Ticket <Arrow />
              </button>
            </form>
          )}
        </div>

        {/* Support Status & Emergency Contacts */}
        <aside className="panel space-y-4">
          <div className="panel-heading">
            <h2>Active Inquiries</h2>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-tungsten rounded border border-subtle">
              <div className="flex justify-between items-center mb-1">
                <span className="mono text-xs text-titanium">#WSB-7190</span>
                <Status tone="volt">Resolved</Status>
              </div>
              <strong className="text-xs text-chrome block">Music duration verification for Manila Session</strong>
              <span className="text-xs text-muted block mt-1">Closed 2 days ago by Stage Director</span>
            </div>
          </div>

          <div className="pt-4 border-t border-subtle">
            <h3 className="text-sm font-bold text-chrome mb-2">Event Day Emergency Line</h3>
            <p className="text-xs text-titanium leading-relaxed mb-3">
              During competition days, report urgent schedule conflicts or audio replacements to the Stage Marshal at the side-stage console.
            </p>
            <span className="mono text-volt text-xs block font-bold">Desk Phone: +63 (2) 8800-WSB1</span>
          </div>
        </aside>
      </div>
    </main>
  );
}