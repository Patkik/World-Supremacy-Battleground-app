export type StageProjection = { published: false } | {
  published: true; event: string; chapter: string; held: boolean;
  performers: { crew: string; division: string }[]; updated_at: number;
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function label(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 500;
}
export function parseStageProjection(value: unknown): StageProjection {
  if (!record(value)) throw new Error("Invalid stage response");
  if (value.published === false) return { published: false };
  if (value.published !== true || !label(value.event) || !label(value.chapter)
    || typeof value.held !== "boolean" || !Number.isSafeInteger(value.updated_at)
    || (value.updated_at as number) < 0 || !Array.isArray(value.performers)
    || value.performers.length > 100) throw new Error("Invalid stage response");
  const performers = value.performers.map(row => {
    if (!record(row) || !label(row.crew) || !label(row.division)) throw new Error("Invalid performer");
    return { crew: row.crew, division: row.division };
  });
  return { published: true, event: value.event, chapter: value.chapter, held: value.held,
    updated_at: value.updated_at as number, performers };
}

// Schedule after completion: a slow response cannot overlap a later refresh.
export function pollStage(options: {
  load: (signal: AbortSignal) => Promise<unknown>;
  accept: (value: StageProjection) => void;
  fail: () => void;
  visible: () => boolean;
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel?: (timer: ReturnType<typeof setTimeout>) => void;
}) {
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  let stopped = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  async function refresh() {
    if (stopped) return;
    if (!options.visible()) { timer = schedule(() => void refresh(), 5000); return; }
    controller = new AbortController();
    try {
      const value = parseStageProjection(await options.load(controller.signal));
      if (!stopped) { options.accept(value); failures = 0; }
    } catch {
      if (!stopped) { failures++; options.fail(); }
    } finally {
      if (!stopped) timer = schedule(() => void refresh(), Math.min(60000, 5000 * 2 ** Math.min(failures, 4)));
    }
  }
  void refresh();
  return () => { stopped = true; controller?.abort(); if (timer !== undefined) cancel(timer); };
}
