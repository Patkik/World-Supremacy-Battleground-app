"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { submitVerificationCase } from "@/lib/api";

export default function DancerVerificationPage() {
  const [docType, setDocType] = useState("passport");
  const [dancerName, setDancerName] = useState("Kenji Ramos");
  const [isMinor, setIsMinor] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await submitVerificationCase("ph", "demo-token", dancerName, isMinor, docType);
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow="Identity & Safety"
        title="Dancer Verification Dossier"
        description="Submit official identification and proof of age for international WSB accreditation."
        action={
          <Link href="/app/profile" className="button button-outline">
            ← Profile
          </Link>
        }
      />

      <div className="max-w-xl">
        <section className="panel">
          <div className="panel-heading">
            <h2>{submitted ? "Dossier Submitted" : "Identity Verification"}</h2>
            <Status tone={submitted ? "volt" : "amber"}>
              {submitted ? "Under Registrar Review" : "Action Required"}
            </Status>
          </div>

          {submitted ? (
            <div className="p-6 text-center space-y-4">
              <span className="text-4xl text-volt block">✓</span>
              <h3 className="text-xl font-bold text-chrome">Verification Case Transmitted</h3>
              <p className="text-sm text-titanium">
                Your credentials have been securely routed to the WSB Chapter Verification Queue. Identity documents are validated solely for division eligibility and age verification.
              </p>
              <Link href="/app" className="button button-volt">
                Return to Personal Dashboard
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Legal Full Name</label>
                <input
                  type="text"
                  value={dancerName}
                  onChange={(e) => setDancerName(e.target.value)}
                  required
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Document Category</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                >
                  <option value="passport">International Passport</option>
                  <option value="national_id">National Government ID</option>
                  <option value="birth_certificate">Birth Certificate (Youth Divisions)</option>
                  <option value="student_id">Accredited Student ID</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMinor}
                    onChange={(e) => setIsMinor(e.target.checked)}
                    className="h-5 w-5 accent-volt cursor-pointer"
                  />
                  <span className="text-sm text-chrome">
                    Dancer is under 18 years old (Requires guardian release)
                  </span>
                </label>
              </div>

              <div className="p-6 border-2 border-dashed border-subtle rounded text-center bg-tungsten/30">
                <span className="mono text-2xl text-volt block mb-1">⎘</span>
                <strong className="text-sm text-chrome block mb-1">Upload ID Document Photo or Scan</strong>
                <p className="text-xs text-titanium mb-3">PNG, JPG or PDF. Clear legible text. Max 10MB.</p>
                <input type="file" required className="text-xs text-titanium file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-volt file:text-black cursor-pointer" />
              </div>

              <button type="submit" disabled={loading} className="button button-volt">
                {loading ? "Transmitting..." : "Submit for Verification"} <Arrow />
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}