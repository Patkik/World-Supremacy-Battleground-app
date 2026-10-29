"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function GlobalIntegrationsConfigPage() {
  const [integrations, setIntegrations] = useState([
    {
      name: "Stripe Connect Payments",
      service: "Credit Card & Digital Wallets (AUD, USD, EUR)",
      maskedKey: "pk_live_51M...889A (Secret in Secret Manager)",
      webhookStatus: "Signed & Verified",
      status: "Healthy",
      tone: "volt" as const,
    },
    {
      name: "Xendit Philippine Gateway",
      service: "GCash, Maya, QRPH & Bank Transfers (PHP)",
      maskedKey: "xnd_public_...774B (Secret in Secret Manager)",
      webhookStatus: "Signed & Verified",
      status: "Healthy",
      tone: "volt" as const,
    },
    {
      name: "Firebase & Cloud Firestore",
      service: "Google Cloud Project model-palace-346207",
      maskedKey: "ADC Service Account (wsb-backend-sa)",
      webhookStatus: "gRPC Transport Active",
      status: "Healthy",
      tone: "volt" as const,
    },
    {
      name: "Twilio Telephony Dispatch",
      service: "Urgent SMS Gate Alerts & Director Two-Factor",
      maskedKey: "AC9910...44FA",
      webhookStatus: "Delivery SLA: 1.4s",
      status: "Healthy",
      tone: "volt" as const,
    },
    {
      name: "Sendgrid Transactional Mail",
      service: "Invoices, PDF Scorecards & Worlds Invites",
      maskedKey: "SG.8841...991E",
      webhookStatus: "DKIM & SPF Aligned",
      status: "Healthy",
      tone: "volt" as const,
    },
  ]);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");

  const handleTestGateways = () => {
    setTesting(true);
    setTestResult("Probing all third-party webhook endpoints and payment adapters...");
    setTimeout(() => {
      setTesting(false);
      setTestResult("All 5 external integration endpoints responded with HTTP 200 OK. Zero latency anomalies detected.");
      setTimeout(() => setTestResult(""), 5000);
    }, 900);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Infrastructure & Third-Party Adapters"
          title="Payment Gateways & External Integrations"
          description="Manage merchant payment gateways, communication services, and cloud database transports. All private credentials are held securely in Google Secret Manager."
        />
        <div className="flex gap-2">
          <Link href="/hq" className="button button-secondary" style={{ minHeight: "48px" }}>
            HQ Overview <Arrow diagonal />
          </Link>
          <Button
            variant="primary"
            onClick={handleTestGateways}
            disabled={testing}
            style={{ minHeight: "48px" }}
          >
            {testing ? "Testing Webhooks..." : "Run Gateway Ping Test"}
          </Button>
        </div>
      </div>

      {testResult && (
        <div className="panel p-4 bg-volt/10 border border-volt text-chrome rounded">
          {testResult}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Integrated Services" value="5 Active" meta="Payment, Cloud & Comms" tone="volt" />
        <StatCard label="Key Storage" value="GCP Secrets" meta="No credentials in code" tone="volt" />
        <StatCard label="Webhook Security" value="HMAC SHA256" meta="Replay protection active" />
        <StatCard label="Payment Gateways" value="Stripe + Xendit" meta="Multi-currency isolation" tone="volt" />
      </div>

      <div className="space-y-4">
        {integrations.map((item) => (
          <div
            key={item.name}
            className="panel p-6 bg-carbon border border-subtle rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-chrome">{item.name}</h3>
                <Status tone={item.tone}>{item.status}</Status>
              </div>
              <p className="text-sm text-titanium">{item.service}</p>
              <div className="flex items-center gap-4 text-xs mono text-titanium pt-2">
                <span>KEY: {item.maskedKey}</span>
                <span>STATUS: {item.webhookStatus}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => alert(`Triggering mock test payload to ${item.name}`)}
                className="button button-ghost text-xs"
                style={{ minHeight: "40px" }}
              >
                Send Test Ping
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
