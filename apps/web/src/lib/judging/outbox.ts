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

function validStoredOperation(record: ScoreOperation, owner: string) {
  const command = record.command;
  const criteria = command?.criteria;
  return record.owner === owner
    && !!record.chapter && !!record.event
    && record.key === operationKey(owner, record.chapter, record.event, command?.operation_id ?? "")
    && command?.schema_version === 1
    && typeof command.operation_id === "string" && command.operation_id.length > 0 && command.operation_id.length <= 128
    && typeof command.division_id === "string" && command.division_id.length > 0
    && typeof command.crew_id === "string" && command.crew_id.length > 0
    && Number.isSafeInteger(command.expected_revision) && command.expected_revision >= 0 && command.expected_revision < Number.MAX_SAFE_INTEGER
    && Array.isArray(command.deductions) && command.deductions.length === 0
    && !!criteria && [criteria.choreography, criteria.musicality, criteria.execution, criteria.stage_presence, criteria.entertainment]
      .every(value => Number.isFinite(value) && value >= 0 && value <= 20)
    && Number.isSafeInteger(record.createdAt) && record.createdAt >= 0
    && Number.isSafeInteger(record.attempts) && record.attempts >= 0
    && Number.isSafeInteger(record.nextAttemptAt) && record.nextAttemptAt >= 0;
}

function validReceipt(receipt: ScoreReceipt, record: ScoreOperation, owner: string) {
  return !!receipt && typeof receipt === "object"
    && receipt.operation_id === record.command.operation_id
    && receipt.judge_uid === owner
    && receipt.event_id === record.event
    && receipt.crew_id === record.command.crew_id
    && receipt.division_id === record.command.division_id
    && Number.isSafeInteger(receipt.score_revision)
    && receipt.score_revision === record.command.expected_revision + 1
    && Number.isFinite(receipt.net_score) && receipt.net_score >= 0 && receipt.net_score <= 100
    && Number.isSafeInteger(receipt.recorded_at) && receipt.recorded_at >= 0
    && typeof receipt.receipt_id === "string" && receipt.receipt_id.length > 0 && receipt.receipt_id.length <= 128;
}

// Caller must serialize this operation using Web Locks across tabs. Sending rows
// are retried with the same operation ID after a crash or a lost acknowledgement.
export async function flushOutbox(store: ScoreStore, owner: string, send: (operation: ScoreOperation) => Promise<ScoreReceipt>, now = Date.now()) {
  const records = (await store.list(owner)).sort((a, b) => a.createdAt - b.createdAt);
  for (const record of records) {
    if (!["queued", "sending"].includes(record.state)) continue;
    if (!validStoredOperation(record, owner)) {
      await store.put({ ...record, state: "rejected", message: "Saved score data failed local integrity checks. Keep it for review; it was not sent." });
      continue;
    }
    if (record.nextAttemptAt > now) continue;
    const sending: ScoreOperation = { ...record, state: "sending", attempts: record.attempts + 1, message: undefined };
    await store.put(sending);
    try {
      const receipt = await send(sending);
      if (!validReceipt(receipt, record, owner)) {
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
