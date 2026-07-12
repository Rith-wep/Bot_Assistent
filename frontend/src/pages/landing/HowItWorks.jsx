import { BookOpenCheck, Send, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

const STEPS = [
  {
    number: "01",
    icon: UserPlus,
    title: "Sign up",
    description: "Create your account in under a minute — no credit card needed.",
  },
  {
    number: "02",
    icon: BookOpenCheck,
    title: "Add your business info",
    description: "Services, prices, hours, location, FAQs — a guided wizard walks you through it.",
  },
  {
    number: "03",
    icon: Send,
    title: "Connect your Telegram bot",
    description: "Paste one token from @BotFather and you're live — customers can message you immediately.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-page py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-balance font-heading text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Live in three steps.
          </h2>
          <p className="mt-3 text-sm text-ink-muted sm:text-base">
            Most owners are answering their first customer within 15 minutes.
          </p>
        </div>

        <div className="relative mt-14 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map(({ number, icon: Icon, title, description }) => (
            <div key={number} className="relative flex flex-col items-center text-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft">
                <Icon className="h-7 w-7 text-accent-dark" strokeWidth={1.75} />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-base font-heading text-[10px] font-bold text-shell-text">
                  {number}
                </span>
              </div>
              <h3 className="mt-5 font-heading font-bold text-ink">{title}</h3>
              <p className="mt-1.5 max-w-[22ch] text-sm text-ink-muted">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/app/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-dark"
          >
            Start your free trial
          </Link>
        </div>
      </div>
    </section>
  );
}
