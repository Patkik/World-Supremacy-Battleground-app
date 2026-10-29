import Link from "next/link";
import { Brand } from "@/components/ui";

export default function MaintenancePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-obsidian text-center">
      <div className="max-w-md w-full p-8 rounded bg-carbon border border-subtle space-y-6">
        <Brand compact />

        <div className="space-y-2">
          <span className="mono text-xs font-bold text-volt px-3 py-1 rounded bg-volt/10 border border-volt/30 inline-block">
            STAGE STANDBY
          </span>
          <h1 className="text-2xl font-bold text-chrome">Planned Maintenance</h1>
          <p className="text-sm text-titanium leading-relaxed">
            The World Supremacy Battlegrounds platform is currently undergoing scheduled stage infrastructure optimization in preparation for championship live telemetry.
          </p>
        </div>

        <div className="p-4 bg-tungsten rounded border border-subtle text-xs text-titanium">
          <span className="mono block text-chrome mb-1">Expected Service Resumption:</span>
          <strong className="mono text-volt">Within 30 minutes</strong>
        </div>

        <div className="pt-2">
          <Link href="/" className="button button-outline w-full text-center">
            Check Status
          </Link>
        </div>
      </div>
    </main>
  );
}