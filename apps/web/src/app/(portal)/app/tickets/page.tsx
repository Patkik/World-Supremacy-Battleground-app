"use client";

import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function PurchasedTicketsPage() {
  const tickets = [
    {
      id: "TKT-2027-MNL-001",
      event: "Manila Session 2027",
      date: "October 30, 2026 · Doors 09:00 PHT",
      venue: "SM Mall of Asia Arena",
      tier: "VIP ARENA FLOOR ACCESS",
      quantity: 2,
      price: "₱ 3,600.00",
      seats: "Floor Front · Section A · Row 2 · Seats 14–15",
      qr: "WSB-MNL-VIP-9941-A",
      status: "Active & Valid",
      tone: "volt" as const,
    },
    {
      id: "TKT-2026-SYD-004",
      event: "Sydney Qualifier 2026",
      date: "November 14, 2025 · Doors 10:00 AEST",
      venue: "State Sports Centre Sydney",
      tier: "GENERAL ADMISSION",
      quantity: 1,
      price: "$ 45.00 AUD",
      seats: "Lower Tier · General Seating",
      qr: "WSB-SYD-GA-1102-X",
      status: "Archived Used",
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Ticketing & Arena Entry"
          title="My Spectator Tickets & Seat Passes"
          description="Access digital arena admission barcodes, view allocated seat numbers, and manage guest transfers for championship events."
        />
        <Button variant="secondary" onClick={() => window.print()} style={{ minHeight: "48px" }}>
          Print Tickets PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Active Tickets" value="2 VIP Passes" meta="Manila Session 2027" tone="volt" />
        <StatCard label="Gate Entrance" value="VIP Gate 1" meta="Main Arena Lobby" />
        <StatCard label="Transfer State" value="Unlocked" meta="Transferrable via email" tone="volt" />
      </div>

      <div className="space-y-6">
        {tickets.map((t) => (
          <div
            key={t.id}
            className="panel p-6 bg-carbon border border-subtle hover:border-volt transition-colors rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
          >
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <span className="badge badge-volt mono text-xs">{t.tier}</span>
                <Status tone={t.tone}>{t.status}</Status>
                <span className="mono text-xs text-titanium">{t.id}</span>
              </div>
              <h3 className="text-2xl font-black text-chrome">{t.event}</h3>
              <p className="text-sm text-titanium">
                {t.venue} · {t.date}
              </p>
              <div className="p-3 bg-obsidian border border-subtle rounded-lg text-xs mono text-chrome">
                Allocated: <strong className="text-volt">{t.seats}</strong>
              </div>
            </div>

            {/* BARCODE / QR SCANNER DISPLAY */}
            <div className="p-4 bg-obsidian border border-subtle rounded-xl text-center flex flex-col items-center justify-center space-y-2 w-full md:w-auto">
              <div className="w-24 h-24 bg-white rounded p-2 flex items-center justify-center text-obsidian mono font-bold text-xs">
                [QR CODE]
              </div>
              <span className="mono text-[10px] text-titanium">{t.qr}</span>
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto">
              <Link href="/app/payments" className="button button-secondary text-xs" style={{ minHeight: "44px" }}>
                View Payment Receipt <Arrow diagonal />
              </Link>
              <Button
                variant="ghost"
                onClick={() => alert(`Transfer link generated for ${t.id}`)}
                style={{ minHeight: "40px" }}
              >
                Transfer to Guest
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
