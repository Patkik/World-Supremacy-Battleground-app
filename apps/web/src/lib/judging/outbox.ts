// The queue persists commands and receipts, never credentials or peer scores.
export type Criteria = { choreography: number; musicality: number; execution: number; stage_presence: number; entertainment: number };
export type ScoreCommand = { schema_version: 1; operation_id: string; division_id: string; crew_id: string; expected_revision: number; criteria: Criteria; deductions: [] };
export type ScoreReceipt = { operation_id: string; receipt_id: string; event_id: string; division_id: string; crew_id: string; judge_uid: string; score_revision: number; net_score: number; recorded_at: number };
export type OutboxState = "draft" | "queued" | "sending" | "acknowledged" | "conflict" | "rejected";
export type ScoreOperation = {
  key: string; owner: string; chapter: string; event: string; entryId?: string; command: ScoreCommand;
  state: OutboxState; createdAt: number; attempts: number; nextAttemptAt: number;
  message?: string; receipt?: ScoreReceipt;
};
export interface ScoreStore {
  list(owner: string): Promise<ScoreOperation[]>;
  put(value: ScoreOperation): Promise<void>;
  remove(key: string): Promise<void>;
}
export function operationKey(owner: string, chapter: string, event: string, id: string) { return JSON.stringify([owner, chapter, event, id]); }

export function newOperation(owner: string, chapter: string, event: string, command: ScoreCommand): ScoreOperation {
  if (!owner || !chapter || !event || command.schema_version !== 1 || !command.operation_id) throw new Error("A verified account and command version are required.");
  return { key: operationKey(owner, chapter, event, command.operation_id), owner, chapter, event, command: structuredClone(command), state: "draft", createdAt: Date.now(), attempts: 0, nextAttemptAt: 0 };
}

export async function queueOperation(store: ScoreStore, operation: ScoreOperation) {
  const existing = (await store.list(operation.owner)).find(value => value.key === operation.key);
  if (existing && JSON.stringify(existing.command) !== JSON.stringify(operation.command)) throw new Error("A saved command cannot be changed. Create a new draft after reviewing the server state.");
  if (existing && existing.state !== "draft") return existing;
  const queued = { ...operation, state: "queued" as const };
  await store.put(queued);
  return queued;
}

function statusOf(error: unknown): number | undefined {
  return typeof error === "object" && error !== null && "status" in error ? Number(error.status) : undefined;
}

// Caller must serialize this operation using Web Locks across tabs. Sending rows
// are retried with the same operation ID after a crash or a lost acknowledgement.
export async function flushOutbox(store: ScoreStore, owner: string, send: (operation: ScoreOperation) => Promise<ScoreReceipt>, now = Date.now()) {
  const records = (await store.list(owner)).sort((a, b) => a.createdAt - b.createdAt);
  for (const record of records) {
    if (!["queued", "sending"].includes(record.state) || record.nextAttemptAt > now) continue;
    const sending: ScoreOperation = { ...record, state: "sending", attempts: record.attempts + 1, message: undefined };
    await store.put(sending);
    try {
      const receipt = await send(sending);
      if (receipt.operation_id !== record.command.operation_id || receipt.judge_uid !== owner || receipt.event_id !== record.event || receipt.crew_id !== record.command.crew_id || receipt.division_id !== record.command.division_id || receipt.score_revision !== record.command.expected_revision + 1 || !receipt.receipt_id) {
        throw Object.assign(new Error("The server receipt does not match this score. Ask the head judge to review it."), { status: 409 });
      }
      await store.put({ ...sending, state: "acknowledged", receipt, message: "Accepted by server" });
    } catch (error) {
      const status = statusOf(error);
      const state: OutboxState = status === 409 ? "conflict" : status && status >= 400 && status < 500 && ![401, 408, 429].includes(status) ? "rejected" : "queued";
      await store.put({ ...sending, state, nextAttemptAt: now + Math.min(60000, 1000 * 2 ** Math.min(sending.attempts, 6)), message: status === 409 ? "Locked or changed on server. Keep this command for head judge review." : status === 401 ? "Sign in again to send this saved score." : state === "queued" ? "Saved on this device. Waiting to retry." : "The server rejected this command. Keep it for review." });
      // Avoid hammering an unavailable API or an expired session with the rest of the queue.
      if (state === "queued") break;
    }
  }
}
