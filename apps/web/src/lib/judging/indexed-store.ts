import type { ScoreOperation, ScoreStore } from "./outbox";

const DATABASE = "wsb-judge-outbox-v1";
const VERSION = 2;

export interface CachedLineupEntry {
  entry_id: string;
  crew_id: string;
  division_id: string;
  completed?: boolean;
}

export interface CachedLineupRecord {
  key: string;
  owner: string;
  chapter: string;
  event: string;
  items: CachedLineupEntry[];
  updatedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("operations")) {
        const store = db.createObjectStore("operations", { keyPath: "key" });
        store.createIndex("owner", "owner");
      }
      if (!db.objectStoreNames.contains("cached_lineups")) {
        const lineupStore = db.createObjectStore("cached_lineups", { keyPath: "key" });
        lineupStore.createIndex("owner", "owner");
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(new Error("Device storage is unavailable. Your score has not been saved."));
    request.onblocked = () => reject(new Error("Close other WSB tabs before opening device storage."));
  });
}

export class IndexedScoreStore implements ScoreStore {
  async list(owner: string): Promise<ScoreOperation[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("operations", "readonly");
      const request = transaction.objectStore("operations").index("owner").getAll(owner);
      transaction.oncomplete = () => { db.close(); resolve(request.result); };
      transaction.onerror = transaction.onabort = () => { db.close(); reject(new Error("Saved scores could not be read.")); };
    });
  }

  async put(value: ScoreOperation): Promise<void> {
    await this.mutate(store => store.put(value));
  }

  async remove(key: string): Promise<void> {
    await this.mutate(store => store.delete(key));
  }

  private async mutate(action: (store: IDBObjectStore) => IDBRequest): Promise<void> {
    const db = await openDatabase();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("operations", "readwrite");
      action(transaction.objectStore("operations"));
      // Resolve only after the transaction commits, not after the individual write.
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = transaction.onabort = () => { db.close(); reject(new Error("Device storage could not save your score. Keep this screen open and retry.")); };
    });
  }

  // Cached Lineup Store methods for offline lineup persistence
  async getCachedLineup(owner: string, chapter: string, event: string): Promise<CachedLineupEntry[] | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("cached_lineups", "readonly");
      const key = `${owner}:${chapter}:${event}`;
      const request = transaction.objectStore("cached_lineups").get(key);
      transaction.oncomplete = () => {
        db.close();
        resolve(request.result ? (request.result as CachedLineupRecord).items : null);
      };
      transaction.onerror = transaction.onabort = () => {
        db.close();
        reject(new Error("Cached lineup could not be read."));
      };
    });
  }

  async putCachedLineup(owner: string, chapter: string, event: string, items: CachedLineupEntry[]): Promise<void> {
    const db = await openDatabase();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("cached_lineups", "readwrite");
      const key = `${owner}:${chapter}:${event}`;
      const record: CachedLineupRecord = {
        key,
        owner,
        chapter,
        event,
        items,
        updatedAt: Date.now(),
      };
      transaction.objectStore("cached_lineups").put(record);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = transaction.onabort = () => {
        db.close();
        reject(new Error("Could not cache lineup on device."));
      };
    });
  }
}
