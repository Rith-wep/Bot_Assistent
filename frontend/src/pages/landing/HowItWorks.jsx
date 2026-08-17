import { Link } from "react-router-dom";

const STEPS = [
  {
    number: "01",
    title: "Sign up",
    description: "Create your account in under a minute — no credit card needed.",
  },
  {
    number: "02",
    title: "Add your business info",
    description: "Services, prices, hours, location, FAQs — a guided wizard walks you through it.",
  },
  {
    number: "03",
    title: "Connect your Telegram bot",
    description: "Paste one token from @BotFather and you're live — customers can message you immediately.",
  },
];

export default function HowItWorks() {
  return (
    <section className="landing-grid py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mx-auto max-w-lg text-center">
          <div className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-accent-dark">From zero to online</div>
          <h2 className="text-balance font-heading text-3xl font-extrabold tracking-[-0.04em] text-landing-ink sm:text-5xl">
            Live in three steps.
          </h2>
          <p className="mt-3 text-sm text-ink-muted sm:text-base">
            Most owners are answering their first customer within 15 minutes.
          </p>
        </div>

        <div className="relative mt-14 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-7">
          {STEPS.map(({ number, title, description }) => (
            <div key={number} className="relative flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-md">
              <span className="text-sm font-bold text-accent-dark">Step {number}</span>
              <h3 className="mt-3 font-heading font-extrabold text-landing-ink">{title}</h3>
              <p className="mt-1.5 max-w-[22ch] text-sm text-ink-muted">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/app/signup"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-bold text-white shadow-[4px_4px_0_#1e2130] transition-transform hover:-translate-y-0.5"
          >
            Start your free trial
          </Link>
        </div>
      </div>
    </section>
  );
}
