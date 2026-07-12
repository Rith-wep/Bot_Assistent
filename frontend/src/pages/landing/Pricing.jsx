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
    <section className="bg-page py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mx-auto max-w-lg text-center">
          <div className="mb-3 inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-soft-text">
            30-day free trial — no credit card required
          </div>
          <h2 className="text-balance font-heading text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
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
              className={`flex flex-col rounded-2xl border p-6 ${
                tier.highlighted
                  ? "border-accent bg-white shadow-lg ring-1 ring-accent"
                  : "border-gray-200 bg-white"
              }`}
            >
              {tier.highlighted && (
                <span className="mb-3 inline-flex w-fit items-center rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Most popular
                </span>
              )}
              <h3 className="font-heading text-lg font-bold text-ink">{tier.name}</h3>
              <p className="mt-1 text-sm text-ink-muted">{tier.description}</p>
              <p className="mt-4">
                <span className="font-heading text-3xl font-extrabold text-ink">{tier.price}</span>
                <span className="text-sm text-ink-muted">/mo</span>
                <span className="ml-1.5 text-[11px] text-ink-muted">(pricing TBD)</span>
              </p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink">
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
                    : "border border-gray-300 text-ink hover:bg-gray-50"
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
