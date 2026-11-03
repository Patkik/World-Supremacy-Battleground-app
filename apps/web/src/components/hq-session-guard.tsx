"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { usePathname } from "next/navigation";
import { PageHeading } from "@/components/ui";
import { HqSessionError, globalHqSession } from "@/lib/api";
import { firebaseClient } from "@/lib/firebase/client";

type GateState =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "denied"; user: User }
  | { kind: "error"; message: string; user: User }
  | { kind: "authorized"; user: User };

export function HqSessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<GateState>({ kind: "loading" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let current = true;
    const auth = firebaseClient().auth;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!current) return;
      if (!user) {
        setState({ kind: "signed-out" });
        return;
      }
      setState({ kind: "loading" });
      try {
        await globalHqSession();
        if (current) setState({ kind: "authorized", user });
      } catch (error) {
        if (!current) return;
        if (error instanceof HqSessionError && error.status === 403) setState({ kind: "denied", user });
        else setState({ kind: "error", message: error instanceof Error ? error.message : "Unable to verify access.", user });
      }
    });
    return () => {
      current = false;
      unsubscribe();
    };
  }, [pathname, retry]);

  const leaveAccount = useCallback(async () => {
    await signOut(firebaseClient().auth);
    setState({ kind: "signed-out" });
  }, []);

  if (state.kind === "authorized") return <>{children}</>;

  return (
    <main id="main-content" className="workspace-main">
      <section className="connected-stack" aria-live="polite">
        {state.kind === "loading" && <><PageHeading eyebrow="Global HQ access" title="Verifying your authority" description="Checking your signed-in account against the current platform membership record." /><p role="status">Loading global access…</p></>}
        {state.kind === "signed-out" && <><PageHeading eyebrow="Global HQ access" title="Sign in to continue" description="This workspace requires a signed account with a separately provisioned Global HQ role." /><Link className="button button-volt" href={`/sign-in?next=${encodeURIComponent(pathname)}`}>Sign in</Link></>}
        {state.kind === "denied" && <><PageHeading eyebrow="Global HQ access" title="Global access not assigned" description="Your account does not have an active Global HQ membership. Chapter access does not grant platform-wide authority." /><p role="alert" className="form-error">Ask your platform administrator to review your access.</p><button className="button button-outline" onClick={leaveAccount}>Sign out and use another account</button></>}
        {state.kind === "error" && <><PageHeading eyebrow="Global HQ access" title="Access could not be verified" description="The workspace remains closed until the server confirms your current global membership." /><p role="alert" className="form-error">{state.message}</p><div className="flex flex-wrap gap-3"><button className="button button-volt" onClick={() => setRetry(value => value + 1)}>Retry verification</button><button className="button button-outline" onClick={leaveAccount}>Sign out</button></div></>}
      </section>
    </main>
  );
}
