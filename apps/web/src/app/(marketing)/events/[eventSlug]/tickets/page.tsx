import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default async function SpectatorTicketsPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const isHk = eventSlug.includes("hk") || eventSlug.includes("world-championship");
  const eventTitle = isHk ? "Hong Kong World Championship 2027" : "Manila Session 2027";
  const currency = isHk ? "HKD" : "PHP";

  const tiers = [
    {
      name: "General Admission Auditorium",
      price: isHk ? "$280 HKD" : "₱650 PHP",
      features: ["Full Day Session Access", "Unreserved Balcony Seating", "Live Battleground Viewing"],
    },
    {
      name: "Arena Floor Reserved",
      price: isHk ? "$580 HKD" : "₱1,400 PHP",
      features: ["Lower Bowl Stage Proximity", "Reserved Seat Number", "Official Championship Lanyard & Program"],
    },
    {
      name: "VIP Stage Pass & Afterparty",
      price: isHk ? "$980 HKD" : "₱2,800 PHP",
      features: ["Front Row Stage Ringside", "Backstage Warmup Viewing", "Official WSB Streetwear Hoodie", "VIP Meet & Greet"],
    },
  ];

  return (
    <main id="main-content" className="section-wrap py-12">
      <Link className="back-link mb-6 inline-block" href={`/events/${eventSlug}`}>
        ← Back to Event
      </Link>

      <PageHeading
        eyebrow="Auditorium Spectator Passes"
        title={`${eventTitle} Tickets`}
        description="Experience the world's most prestigious street dance crews live on stage. Official ticketing tiers."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {tiers.map((t, idx) => (
          <div key={t.name} className={`panel p-6 flex flex-col justify-between ${idx === 1 ? "border-volt/80" : ""}`}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Status tone={idx === 1 ? "volt" : "neutral"}>{idx === 1 ? "Most Popular" : "Spectator"}</Status>
              </div>
              <h2 className="text-xl font-bold text-chrome">{t.name}</h2>
              <div className="text-3xl font-bold mono text-volt">{t.price}</div>
              <ul className="text-xs text-titanium space-y-2 pt-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-volt">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6">
              <Link
                href="/contact"
                className={`button w-full text-center ${idx === 1 ? "button-volt" : "button-outline"}`}
              >
                Book Tickets <Arrow diagonal />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}