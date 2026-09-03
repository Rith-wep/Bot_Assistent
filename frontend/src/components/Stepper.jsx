import { BookOpenText, Building2, Check, Rocket, Send } from "lucide-react";

const STEPS = [
  { label: "Business", icon: Building2 },
  { label: "Knowledge", icon: BookOpenText },
  { label: "Telegram", icon: Send },
  { label: "Go Live", icon: Rocket },
];

export default function Stepper({ currentStep }) {
  return (
    <div className="mb-6 w-full px-1 sm:mb-10">
      <div className="mx-auto flex w-full max-w-3xl items-start justify-center">
      {STEPS.map(({ label, icon: Icon }, i) => {
        const step = i + 1;
        const isDone = step < currentStep;
        const isActive = step === currentStep;
        return (
          <div key={label} className="flex min-w-0 flex-1 items-start last:flex-none sm:flex-none">
            <div className="flex w-14 shrink-0 flex-col items-center sm:w-24">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-150 sm:h-10 sm:w-10 ${
                  isDone
                    ? "bg-accent-soft text-accent-dark"
                    : isActive
                      ? "border-2 border-accent bg-white text-accent-dark shadow-[0_0_0_5px_rgba(34,197,94,0.12)]"
                      : "border border-gray-300 bg-white text-gray-400"
                }`}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={3} />
                ) : (
                  <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" strokeWidth={2.4} />
                )}
              </div>
              <span
                className={`mt-1.5 whitespace-nowrap text-[10px] leading-none sm:mt-2 sm:text-xs ${
                  isActive ? "font-bold text-ink" : "font-medium text-ink-muted"
                }`}
              >
                {label}
              </span>
            </div>
            {step < STEPS.length && (
              <div
                className={`mt-[15px] h-0.5 min-w-3 flex-1 rounded-full transition-colors sm:mt-[19px] sm:w-[clamp(28px,8vw,96px)] sm:flex-none ${
                  isDone ? "bg-accent" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
