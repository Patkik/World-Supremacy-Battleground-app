import Link from "next/link";
import { Brand } from "@/components/ui";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-obsidian text-center">
      <div className="max-w-md w-full p-8 rounded bg-carbon border border-subtle space-y-6">
        <Brand compact />

        <div className="space-y-2">
          <span className="mono text-xs font-bold text-titanium px-3 py-1 rounded bg-tungsten border border-subtle inline-block">
            404 NOT FOUND
          </span>
          <h1 className="text-2xl font-bold text-chrome">Page Not Found</h1>
          <p className="text-sm text-titanium leading-relaxed">
            The championship stage, crew profile, or document you requested does not exist or has been moved.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/" className="button button-volt w-full text-center">
            Return to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}