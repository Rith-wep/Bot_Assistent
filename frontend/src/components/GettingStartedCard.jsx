import { Bell, BookOpen, Check, ChevronRight, CreditCard, PartyPopper, Send, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const DISMISS_KEY = "dashboard_setup_dismissed";

function buildSteps(checklist) {
  return [
    {
      key: "knowledge_added",
      label: "Add knowledge",
      why: "So your assistant can answer customers accurately",
      icon: BookOpen,
      to: "/app/knowledge",
      done: checklist.knowledge_added,
    },
    {
      key: "telegram_connected",
      label: "Connect Telegram bot",
      why: "So customers can actually message your assistant",
      icon: Send,
      to: "/app/settings",
      done: checklist.telegram_connected,
    },
    {
      key: "admin_notifications_connected",
      label: "Connect admin notifications",
      why: "So you get notified about new leads and handoffs",
      icon: Bell,
      to: "/app/settings",
      done: checklist.admin_notifications_connected,
    },
    {
      key: "payments_enabled",
      label: "Enable payments",
      why: "Not available yet — coming soon",
      icon: CreditCard,
      to: null,
      done: checklist.payments_enabled,
    },
  ];
}

export default function GettingStartedCard({ checklist }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "true"
  );

  const steps = buildSteps(checklist);
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  // Only an actionable step (one with somewhere to go) counts as "next" —
  // payments has nowhere to click yet, so it never gets the emphasized state.
  const nextIndex = steps.findIndex((s) => !s.done && s.to);

  if (allDone && dismissed) return null;

  if (allDone) {
    return (
      <div className="mb-6 lg:mb-4 flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-soft px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <PartyPopper className="h-5 w-5 text-accent-dark" strokeWidth={2} />
          <span className="font-heading font-bold text-accent-soft-text">Setup complete 🎉</span>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "true");
            setDismissed(true);
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-accent-dark/70 transition-colors duration-150 hover:bg-white/50 hover:text-accent-dark"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 lg:mb-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="font-heading font-bold text-ink">
        Getting started — {doneCount} of {steps.length} done
      </h2>

      <div className="mt-4 mb-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <div>
        {steps.map((step, i) => {
          const isNext = i === nextIndex;
          const interactive = !step.done && !!step.to;

          const inner = (
            <>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ${
                  step.done
                    ? "bg-accent-soft"
                    : isNext
                      ? "bg-accent"
                      : "bg-gray-100"
                }`}
              >
                {step.done ? (
                  <Check className="h-4 w-4 text-accent-dark" strokeWidth={2.5} />
                ) : (
                  <step.icon
                    className={`h-4 w-4 ${isNext ? "text-white" : "text-ink-muted"}`}
                    strokeWidth={2}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    step.done ? "text-ink-muted line-through" : "text-ink"
                  }`}
                >
                  {step.label}
                </p>
                {!step.done && <p className="mt-1 text-xs text-ink-muted">{step.why}</p>}
              </div>
              {interactive && (
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={2} />
              )}
              {!step.done && !step.to && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  Soon
                </span>
              )}
            </>
          );

          // Left accent bar and top divider are two independent concerns —
          // deliberately using directional border-{side}-{color} utilities
          // (not the border-color shorthand) so they can never bleed into
          // each other the way they did before.
          const rowClass = `flex items-center gap-4 border-l-2 border-t first:border-t-0 py-4 pl-4 pr-3 transition-all duration-150 border-t-gray-100 ${
            isNext ? "border-l-accent bg-accent-soft/25" : "border-l-transparent"
          } ${
            interactive
              ? isNext
                ? "hover:-translate-y-px hover:shadow-sm hover:bg-accent-soft/40"
                : "hover:-translate-y-px hover:shadow-sm hover:bg-gray-50"
              : ""
          }`;

          return interactive ? (
            <Link key={step.key} to={step.to} className={rowClass}>
              {inner}
            </Link>
          ) : (
            <div key={step.key} className={rowClass}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
