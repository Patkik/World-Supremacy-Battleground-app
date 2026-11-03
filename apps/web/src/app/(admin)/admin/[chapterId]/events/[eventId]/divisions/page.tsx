"use client";

import { use } from "react";
import { DivisionPanelWorkspace } from "@/components/division-panel-workspace";

export default function EventDivisionsPage({ params }: { params: Promise<{ chapterId: string; eventId: string }> }) {
  const { chapterId, eventId } = use(params);
  return <DivisionPanelWorkspace chapter={chapterId} event={eventId} />;
}
