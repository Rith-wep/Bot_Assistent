import { ChevronDown } from "lucide-react";
import { useState } from "react";

const FAQS = [
  {
    q: "Will my customers know they're talking to a bot?",
    a: "We don't hide it, and we don't make it awkward either. Your assistant introduces itself by name in its first reply, so customers know from the start. If a conversation ever needs a real person, it's handed off to you right away.",
  },
  {
    q: "What happens when it can't answer a question?",
    a: "It says so honestly instead of guessing — your assistant only ever answers from the business information you've given it, never invents anything. If it misses a couple of questions in a row, the conversation is flagged for you and, if you've turned on handoff, you're notified on Telegram immediately.",
  },
  {
    q: "Do I need any technical skills to set this up?",
    a: "No coding at all. Creating your Telegram bot is copying one message from @BotFather and pasting it back — the setup wizard walks you through everything else in plain language, in about 15 minutes.",
  },
  {
    q: "What happens to my data?",
    a: "Your business info and conversations are stored securely and belong to you alone — we never share it with other businesses, and every business's data is fully isolated. You can edit or delete your knowledge and conversations anytime from Settings.",
  },
  {
    q: "How do I pay?",
    a: "You get a 30-day free trial with nothing to enter up front. Billing today is handled manually — no payment gateway yet — so we'll follow up directly to arrange payment before your trial ends.",
  },
  {
    q: "What if i want to cancel?",
    a: "You can cancel anytime from Setting, and your subscription will end at the end of your current billing period. We don't do refunds"
  }
];

function FAQItem({ q, a, open, onToggle }) {
  return (
    <div className="mb-3 rounded-2xl border border-landing-ink/15 bg-white px-5 py-4 transition-colors hover:border-accent/50">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span className="font-heading font-bold text-ink">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>
      {open && <p className="mt-2.5 text-sm text-ink-muted">{a}</p>}
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="landing-grid py-20 sm:py-28">
      <div className="mx-auto max-w-2xl px-5 sm:px-8">
        <div className="text-center">
          <div className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-accent-dark">Nothing hidden</div>
          <h2 className="text-balance font-heading text-3xl font-extrabold tracking-[-0.04em] text-landing-ink sm:text-5xl">
            Questions owners actually ask.
          </h2>
        </div>

        <div className="mt-10">
          {FAQS.map((item, i) => (
            <FAQItem
              key={item.q}
              q={item.q}
              a={item.a}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
