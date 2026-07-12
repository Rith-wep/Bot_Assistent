import { Check } from "lucide-react";

const STEPS = ["Business", "Knowledge", "Telegram", "Go Live"];

export default function Stepper({ currentStep }) {
  return (
    <div className="mb-10 flex items-center justify-center">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isDone = step < currentStep;
        const isActive = step === currentStep;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors duration-150 ${
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
                className={`mt-1.5 text-xs font-medium ${isActive ? "text-ink" : "text-ink-muted"}`}
              >
                {label}
              </span>
            </div>
            {step < STEPS.length && (
              <div
                className={`mx-2 h-0.5 w-8 shrink-0 sm:w-16 ${isDone ? "bg-accent" : "bg-gray-300"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
