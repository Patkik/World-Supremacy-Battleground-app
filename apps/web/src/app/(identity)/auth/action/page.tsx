"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Arrow, Brand, PageHeading, Status } from "@/components/ui";

function AuthActionContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "verifyEmail";
  const oobCode = searchParams.get("oobCode") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [newPassword, setNewPassword] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (mode === "verifyEmail") {
      // Simulate verification of oobCode
      const timer = setTimeout(() => {
        setStatus("success");
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setStatus("success");
    }
  }, [mode, oobCode]);

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setCompleted(true);
  }

  return (
    <div className="auth-card">
      <Brand />
      
      {mode === "verifyEmail" && (
        <div className="space-y-4 pt-4">
          <PageHeading
            eyebrow="Account Verification"
            title={status === "loading" ? "Verifying Email..." : "Email Verified"}
            description={
              status === "loading"
                ? "Checking security token with identity authority."
                : "Your email address has been successfully verified. You now have full access to crew registration."
            }
          />
          {status === "success" && (
            <div className="pt-4">
              <Link href="/workspaces" className="button button-volt w-full text-center">
                Continue to Workspaces <Arrow />
              </Link>
            </div>
          )}
        </div>
      )}

      {mode === "resetPassword" && (
        <div className="space-y-4 pt-4">
          <PageHeading
            eyebrow="Security Recovery"
            title="Set New Password"
            description="Choose a strong password to protect your crew and dancer account."
          />
          {completed ? (
            <div className="space-y-4 text-center">
              <Status tone="volt">Password Updated</Status>
              <p className="text-sm text-titanium">Your password has been changed. You can now sign in.</p>
              <Link href="/sign-in" className="button button-volt w-full text-center">
                Sign In with New Password <Arrow />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                />
              </div>
              <button type="submit" className="button button-volt w-full">
                Save New Password <Arrow />
              </button>
            </form>
          )}
        </div>
      )}

      {mode !== "verifyEmail" && mode !== "resetPassword" && (
        <div className="space-y-4 pt-4 text-center">
          <PageHeading
            eyebrow="Identity Action"
            title="Action Received"
            description="Your security action code has been acknowledged."
          />
          <Link href="/sign-in" className="button button-outline w-full text-center">
            Return to Sign In <Arrow />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-obsidian">
      <Suspense fallback={<div className="text-chrome mono text-center">Verifying credentials...</div>}>
        <AuthActionContent />
      </Suspense>
    </main>
  );
}