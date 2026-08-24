import { Check } from "lucide-react";

const STEPS = ["Business", "Knowledge", "Telegram", "Go Live"];

export default function Stepper({ currentStep }) {
  return (
    <div className="mb-8 flex w-full items-start justify-center overflow-x-auto px-1 sm:mb-10">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isDone = step < currentStep;
        const isActive = step === currentStep;
        return (
          <div key={label} className="flex min-w-0 items-start">
            <div className="flex w-16 shrink-0 flex-col items-center sm:w-20">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors duration-150 ${
                  isDone
                    ? "bg-accent text-white"
                    : isActive
                      ? "border-2 border-accent text-accent"
                      : "border-2 border-gray-300 text-gray-400"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : step}
              </div>
              <span
                className={`mt-2 whitespace-nowrap text-xs font-medium ${isActive ? "text-ink" : "text-ink-muted"}`}
              >
                {label}
              </span>
            </div>
            {step < STEPS.length && (
              <div
                className={`mt-[19px] h-0.5 w-[clamp(18px,8vw,80px)] shrink ${isDone ? "bg-accent" : "bg-gray-300"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
