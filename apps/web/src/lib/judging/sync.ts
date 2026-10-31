"use client";
import { connectedRequest, segment } from "../connected-api";
import { IndexedScoreStore } from "./indexed-store";
import { flushOutbox, type ScoreReceipt } from "./outbox";
export const scoreStore = new IndexedScoreStore();

export async function synchronizeScores(owner: string) {
  if (!navigator.onLine) return;
  if (!navigator.locks) throw new Error("This browser cannot safely synchronize across tabs. Use an up-to-date browser on your judging device.");
  await navigator.locks.request(`wsb-score-sync:${owner}`, { ifAvailable: true }, async lock => {
    if (!lock) return;
    await flushOutbox(scoreStore, owner, operation => connectedRequest<ScoreReceipt>(`/v1/chapters/${segment(operation.chapter)}/events/${segment(operation.event)}/scores`, operation.command, "POST", operation.owner));
  });
}
