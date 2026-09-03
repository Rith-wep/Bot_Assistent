import { Bell, BookOpen, Check, ChevronRight, CreditCard, PartyPopper, Send, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const DISMISS_KEY = "dashboard_setup_dismissed";

function buildSteps(checklist) {
  return [
    {
      key: "knowledge_added",
      label: "Add knowledge",
      icon: BookOpen,
      to: "/app/knowledge",
      done: checklist.knowledge_added,
    },
    {
      key: "telegram_connected",
      label: "Connect Telegram bot",
      icon: Send,
      to: "/app/settings",
      done: checklist.telegram_connected,
    },
    {
      key: "admin_notifications_connected",
      label: "Connect admin notifications",
      icon: Bell,
      to: "/app/settings",
      done: checklist.admin_notifications_connected,
    },
    {
      key: "payments_enabled",
      label: "Enable payments",
      icon: CreditCard,
      to: null,
      done: checklist.payments_enabled,
    },
  ];
}

export default function GettingStartedCard({ checklist }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "true",
  );

  const steps = buildSteps(checklist);
  const doneCount = steps.filter((step) => step.done).length;
  const allDone = doneCount === steps.length;
  const nextIndex = steps.findIndex((step) => !step.done && step.to);

  if (allDone && dismissed) return null;

  if (allDone) {
    return (
      <div className="mb-6 lg:mb-4 flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <PartyPopper className="h-5 w-5 text-accent-dark" strokeWidth={2} />
          <span className="font-heading font-bold text-gray-900">Setup complete</span>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "true");
            setDismissed(true);
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 lg:mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-md sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-heading font-bold text-gray-900">Getting started</h2>
          <p className="mt-0.5 text-sm text-gray-500">{doneCount} of {steps.length} complete</p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 sm:w-48">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        {steps.map((step, index) => {
          const isNext = index === nextIndex;
          const interactive = !step.done && Boolean(step.to);
          const Icon = step.icon;
          const inner = (
            <>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${
                  step.done ? "bg-accent-soft" : isNext ? "bg-accent" : "bg-gray-100"
                }`}
              >
                {step.done ? (
                  <Check className="h-4 w-4 text-accent-dark" strokeWidth={2.5} />
                ) : (
                  <Icon className={`h-4 w-4 ${isNext ? "text-white" : "text-gray-500"}`} strokeWidth={2} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${step.done ? "text-gray-400" : "text-gray-900"}`}>
                  {step.label}
                </p>
              </div>
              {interactive && <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} />}
              {!step.done && !step.to && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Soon
                </span>
              )}
            </>
          );
          const rowClass = `flex min-h-16 items-center gap-3 rounded-lg border px-3 py-3 transition-all duration-150 ${
            step.done
              ? "border-gray-100 bg-gray-50/70"
              : isNext
                ? "border-accent/30 bg-accent-soft/30"
                : "border-gray-100 bg-white"
          } ${
            interactive
              ? isNext
                ? "hover:-translate-y-px hover:bg-accent-soft/50 hover:shadow-sm"
                : "hover:-translate-y-px hover:bg-gray-50 hover:shadow-sm"
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
