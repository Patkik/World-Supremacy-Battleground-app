"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { fetchVerificationCases, reviewVerificationCase, VerificationCase } from "@/lib/api";

export default function VerificationReviewQueuePage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);
  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchVerificationCases(chapterId, "demo-token");
        setCases(data);
      } catch {
        setCases([
          {
            case_id: "case-2001",
            chapter_id: chapterId,
            dancer_uid: "dancer-5",
            dancer_name: "Carlo Lim",
            is_minor: true,
            status: "approved",
            document_type: "Guardian Release & Government ID",
            submitted_at: 1700000000,
            reviewed_at: 1700000000,
            reviewer_note: "Verified parent signature matches passport ID",
          },
          {
            case_id: "case-2002",
            chapter_id: chapterId,
            dancer_uid: "dancer-6",
            dancer_name: "Samantha Lee",
            is_minor: false,
            status: "pending",
            document_type: "National ID Card",
            submitted_at: 1700000100,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [chapterId]);

  async function handleReview(caseId: string, status: "approved" | "rejected") {
    setReviewingId(caseId);
    try {
      const updated = await reviewVerificationCase(chapterId, "demo-token", caseId, status);
      setCases(cases.map((c) => (c.case_id === caseId ? updated : c)));
    } catch {
      setCases(
        cases.map((c) => (c.case_id === caseId ? { ...c, status } : c))
      );
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Chapter / ${chapterId.toUpperCase()} / Registrar`}
        title="Identity & Guardian Verification Queue"
        description="Review uploaded identification documents, verify minor age credentials, and counter-sign guardian waivers."
        action={
          <Link href={`/admin/${chapterId}`} className="button button-outline">
            ← Dashboard
          </Link>
        }
      />

      <section className="panel roster-panel">
        <div className="panel-heading">
          <div>
            <h2>Pending & Approved Verification Cases</h2>
            <p>Documents verified solely for eligibility purposes</p>
          </div>
          <span className="mono text-volt font-bold">{cases.length} Cases</span>
        </div>

        <div className="roster-table">
          <div className="roster-header">
            <span>Dancer Name & ID</span>
            <span>Category</span>
            <span>Document Type</span>
            <span>Status</span>
            <span>Registrar Action</span>
          </div>
          {cases.map((c) => (
            <div className="roster-record" key={c.case_id}>
              <div>
                <strong>{c.dancer_name}</strong>
                <span className="mono text-xs text-muted block">{c.case_id}</span>
              </div>
              <span className="text-sm text-titanium">{c.is_minor ? "Minor (14&U)" : "Adult"}</span>
              <span className="text-xs text-chrome">{c.document_type}</span>
              <Status tone={c.status === "approved" ? "volt" : "amber"}>
                {c.status.toUpperCase()}
              </Status>
              <div className="flex gap-2">
                {c.status === "pending" ? (
                  <>
                    <button
                      onClick={() => handleReview(c.case_id, "approved")}
                      disabled={reviewingId === c.case_id}
                      className="button button-volt text-xs py-1"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(c.case_id, "rejected")}
                      disabled={reviewingId === c.case_id}
                      className="button button-outline text-xs py-1 text-crimson"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-muted mono">Reviewed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}