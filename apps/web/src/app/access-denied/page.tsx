import Link from "next/link";
import { Arrow, Brand } from "@/components/ui";

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-obsidian text-center">
      <div className="max-w-md w-full p-8 rounded bg-carbon border border-subtle space-y-6">
        <Brand compact />

        <div className="space-y-2">
          <span className="mono text-xs font-bold text-crimson px-3 py-1 rounded bg-crimson/10 border border-crimson/30 inline-block">
            403 FORBIDDEN
          </span>
          <h1 className="text-2xl font-bold text-chrome">Access Denied</h1>
          <p className="text-sm text-titanium leading-relaxed">
            You do not possess the required chapter authorization or administrative credentials to view this screen.
          </p>
        </div>

        <div className="p-4 bg-tungsten rounded border border-subtle text-xs text-left text-titanium space-y-2">
          <strong className="text-chrome block">Cross-Chapter Isolation Security:</strong>
          <p>
            WSB enforces strict tenant boundaries. Ensure your active identity holds an accredited role for this chapter.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <Link href="/workspaces" className="button button-volt w-full text-center">
            Switch Workspace <Arrow />
          </Link>
          <Link href="/" className="button button-outline w-full text-center">
            Return to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}