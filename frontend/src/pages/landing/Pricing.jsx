import { Check } from "lucide-react";
import { Link } from "react-router-dom";

// NOTE: prices are placeholders (TBD) — swap in real numbers before this
// page goes public. Feature lists reflect what's actually built.
const TIERS = [
  {
    name: "Basic",
    price: "$XX",
    description: "For a single owner handling their own bot.",
    features: [
      "1 Telegram bot",
      "Khmer, English & Chinese replies",
      "Unlimited knowledge items",
      "Lead capture",
      "Human handoff",
    ],
    highlighted: false,
  },
  {
    name: "Standard",
    price: "$XX",
    description: "For a growing business that wants to close knowledge gaps.",
    features: [
      "Everything in Basic",
      "Weekly Intelligence — gap insights",
      "Extra admin notification recipients",
      "Weekly summary to your Telegram",
    ],
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$XX",
    description: "For a business that wants priority support.",
    features: [
      "Everything in Standard",
      "Priority support",
      "Early access to new features",
    ],
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-28">
      <div className="absolute -left-24 top-32 h-64 w-64 rounded-full bg-landing-lime/60 blur-3xl" />
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mx-auto max-w-lg text-center">
          <div className="mb-4 inline-flex -rotate-1 items-center rounded-full border border-landing-ink bg-landing-lime px-3 py-1 text-xs font-extrabold text-landing-ink shadow-[2px_2px_0_#1e2130]">
            30-day free trial — no credit card required
          </div>
          <h2 className="text-balance font-heading text-3xl font-extrabold tracking-[-0.04em] text-landing-ink sm:text-5xl">
            Simple pricing.
          </h2>
          <p className="mt-3 text-sm text-ink-muted sm:text-base">
            Pick a plan when your trial ends — upgrade or downgrade anytime.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-[1.75rem] border-2 p-6 ${
                tier.highlighted
                  ? "border-landing-ink bg-landing-ink text-white shadow-[8px_9px_0_#22c55e] md:-translate-y-3 md:-rotate-1"
                  : "border-landing-ink bg-landing-paper shadow-[6px_7px_0_#1e2130]"
              }`}
            >
              {tier.highlighted && (
                <span className="mb-3 inline-flex w-fit items-center rounded-full bg-landing-lime px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-landing-ink">
                  Most popular
                </span>
              )}
              <h3 className={`font-heading text-lg font-bold ${tier.highlighted ? "text-white" : "text-ink"}`}>{tier.name}</h3>
              <p className={`mt-1 text-sm ${tier.highlighted ? "text-white/60" : "text-ink-muted"}`}>{tier.description}</p>
              <p className="mt-4">
                <span className={`font-heading text-3xl font-extrabold ${tier.highlighted ? "text-white" : "text-ink"}`}>{tier.price}</span>
                <span className={tier.highlighted ? "text-sm text-white/60" : "text-sm text-ink-muted"}>/mo</span>
                <span className={`ml-1.5 text-[11px] ${tier.highlighted ? "text-white/50" : "text-ink-muted"}`}>(pricing TBD)</span>
              </p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2 text-sm ${tier.highlighted ? "text-white/80" : "text-ink"}`}>
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/app/signup"
                className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                  tier.highlighted
                    ? "bg-accent text-white hover:bg-accent-dark"
                    : "border border-landing-ink bg-white text-ink hover:bg-landing-lime"
                }`}
              >
                Start free trial
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
