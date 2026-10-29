import "client-only";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { initializeFirestore, memoryLocalCache, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

function createClient() {
  const emulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) throw new Error("Firebase configuration is missing.");
  if (emulator && projectId !== "demo-wsb") throw new Error("Use demo-wsb for isolated emulator development.");
  const app = getApps().length ? getApp() : initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  });
  const auth = getAuth(app);
  // Persistent shared-device caches require an explicit trusted-device lifecycle.
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  const storage = getStorage(app);
  if (emulator) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  }
  return { app, auth, db, storage };
}
const scope = globalThis as typeof globalThis & { __wsbFirebase?: ReturnType<typeof createClient> };
export function firebaseClient() {
  if (typeof window === "undefined") throw new Error("Firebase client requires a browser.");
  return scope.__wsbFirebase ??= createClient();
}
// Call only after consent; analytics never loads during SSR or local emulation.
export async function enableAnalyticsAfterConsent() {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") return null;
  const { isSupported, getAnalytics } = await import("firebase/analytics");
  return await isSupported() ? getAnalytics(firebaseClient().app) : null;
}
