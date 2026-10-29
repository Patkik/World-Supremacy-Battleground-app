"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, Select, Input, Textarea, StatCard } from "@/components/ui";

export default function ChapterOrStudioApplyPage() {
  const [appType, setAppType] = useState("chapter");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    orgName: "",
    applicantName: "",
    email: "",
    phone: "",
    country: "Philippines",
    city: "",
    experience: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-6">
      <PageHeading
        eyebrow="Expand the Movement"
        title="Chapter License & Studio Hub Application"
        description="Partner with World Supremacy Battlegrounds to host an accredited regional qualifier or certify your dance facility as an official training academy."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Chapter License" value="20+ Markets" meta="Exclusive territorial rights" tone="volt" />
        <StatCard label="Studio Network" value="48 Hubs" meta="Masterclass tour routes" />
        <StatCard label="Review SLA" value="5 Business Days" meta="Direct global committee" tone="volt" />
      </div>

      {submitted ? (
        <div className="panel p-8 bg-carbon border-2 border-volt text-center space-y-4 rounded-2xl">
          <Status tone="volt">APPLICATION RECEIVED & RECORDED</Status>
          <h2 className="text-3xl font-extrabold text-chrome">
            Thank you, {formData.applicantName || "Director"}!
          </h2>
          <p className="text-sm text-titanium max-w-lg mx-auto">
            Your application for <strong>{formData.orgName || "your organization"}</strong> ({appType === "chapter" ? "Regional Chapter Host" : "Accredited Studio Hub"}) in {formData.city || "your city"}, {formData.country} has been logged in our global licensing ledger.
          </p>
          <p className="mono text-xs text-titanium">
            REFERENCE: WSB-APP-2027-0x{Date.now().toString(16).toUpperCase()}
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Link href="/" className="button button-volt" style={{ minHeight: "48px" }}>
              Return to Home <Arrow />
            </Link>
            <Link href="/about" className="button button-secondary" style={{ minHeight: "48px" }}>
              Explore Movement
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="panel p-8 bg-carbon border border-subtle rounded-2xl space-y-6">
          <h3 className="text-xl font-bold text-chrome">Application Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-titanium mb-1">APPLICATION TYPE</label>
              <Select
                value={appType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAppType(e.target.value)}
                style={{ minHeight: "48px" }}
              >
                <option value="chapter">Official Chapter License (Host Regional Qualifier)</option>
                <option value="studio">Accredited Studio Hub (Training & Masterclasses)</option>
                <option value="scrutineer">Judging / Scrutineer Academy Certification</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-mono text-titanium mb-1">ORGANIZATION / STUDIO NAME</label>
              <Input
                value={formData.orgName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, orgName: e.target.value })
                }
                placeholder="e.g. Metro Manila Urban Arts Hub"
                required
                style={{ minHeight: "48px" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-titanium mb-1">PRIMARY CONTACT / DIRECTOR NAME</label>
              <Input
                value={formData.applicantName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, applicantName: e.target.value })
                }
                placeholder="e.g. Maria Clara Santos"
                required
                style={{ minHeight: "48px" }}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-titanium mb-1">OFFICIAL EMAIL</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="director@studio.com"
                required
                style={{ minHeight: "48px" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-titanium mb-1">CONTACT PHONE</label>
              <Input
                value={formData.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+63 917 123 4567"
                required
                style={{ minHeight: "48px" }}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-titanium mb-1">COUNTRY</label>
              <Input
                value={formData.country}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                style={{ minHeight: "48px" }}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-titanium mb-1">TARGET CITY / REGION</label>
              <Input
                value={formData.city}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="e.g. Cebu City"
                required
                style={{ minHeight: "48px" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-titanium mb-1">
              PAST PRODUCTION / DANCE EVENT EXPERIENCE & FACILITY OVERVIEW
            </label>
            <Textarea
              value={formData.experience}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData({ ...formData, experience: e.target.value })
              }
              placeholder="Outline your venue size, past urban dance events, community reach, and proposed competition dates..."
              rows={4}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full"
            style={{ minHeight: "52px" }}
          >
            {loading ? "Submitting Application to Global HQ..." : "Submit Official Application"}
          </Button>
        </form>
      )}
    </div>
  );
}
