"use client";

import Link from "next/link";
import { Brand } from "@/components/ui";

export default function ErrorPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-obsidian text-center">
      <div className="max-w-md w-full p-8 rounded bg-carbon border border-subtle space-y-6">
        <Brand compact />

        <div className="space-y-2">
          <span className="mono text-xs font-bold text-amber-400 px-3 py-1 rounded bg-amber-400/10 border border-amber-400/30 inline-block">
            UNEXPECTED INTERRUPT
          </span>
          <h1 className="text-2xl font-bold text-chrome">Something Went Wrong</h1>
          <p className="text-sm text-titanium leading-relaxed">
            This page could not be opened. If you were submitting a change, check its saved status before submitting again.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="button button-volt w-full text-center"
          >
            Retry Connection
          </button>
          <Link href="/" className="button button-outline w-full text-center">
            Return to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
