"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState([
    {
      id: "notif-1",
      title: "Audio Track Duration Approved",
      body: "Your performance track for Manila Session (Open Crew) has passed duration compliance (172s / 180s cap).",
      date: "2 hours ago",
      read: false,
      tag: "Music",
    },
    {
      id: "notif-2",
      title: "Payment Reconciled (₱7,200.00)",
      body: "Registration fee payment confirmed. Receipt #pay-1001 issued.",
      date: "1 day ago",
      read: true,
      tag: "Finance",
    },
    {
      id: "notif-3",
      title: "Guardian Consent Verified",
      body: "Minor dancer Carlo Lim's parental waiver release has been verified by the Chapter Registrar.",
      date: "2 days ago",
      read: true,
      tag: "Consent",
    },
  ]);

  function markAllRead() {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow="Activity & Alerts"
        title="Notification Center"
        description="Important announcements from Chapter Operations, stage timing updates, and readiness notices."
        action={
          <button onClick={markAllRead} className="button button-outline text-xs">
            Mark All as Read
          </button>
        }
      />

      <div className="space-y-3 max-w-3xl">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`panel p-4 flex justify-between items-start gap-4 transition-colors ${
              !n.read ? "border-volt/50 bg-tungsten/60" : ""
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Status tone={!n.read ? "volt" : "neutral"}>{n.tag}</Status>
                <strong className="text-chrome text-sm">{n.title}</strong>
              </div>
              <p className="text-xs text-titanium leading-relaxed">{n.body}</p>
              <span className="mono text-xs text-muted block mt-1">{n.date}</span>
            </div>
            {!n.read && <span className="h-2 w-2 rounded-full bg-volt shrink-0 mt-1" />}
          </div>
        ))}
      </div>
    </main>
  );
}