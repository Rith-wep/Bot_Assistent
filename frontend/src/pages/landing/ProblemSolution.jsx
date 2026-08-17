import { ArrowRight, Zap } from "lucide-react";

const PAIRS = [
  {
    problem: "Customers message at 9pm — nobody answers.",
    solution: "Your assistant replies instantly, any time of day or night.",
  },
  {
    problem: "Staff answer the same 10 questions all day.",
    solution: "Your assistant handles the repetitive questions on its own.",
  },
  {
    problem: "Interested buyers disappear without leaving a number.",
    solution: "Every lead is captured and sent straight to your phone.",
  },
];

export default function ProblemSolution() {
  return (
    <section className="landing-noise relative overflow-hidden bg-landing-ink py-20 sm:py-28">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full border-[40px] border-accent/10" />
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mx-auto max-w-lg text-center">
          <div className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-accent">The daily leak</div>
          <h2 className="text-balance font-heading text-3xl font-extrabold tracking-[-0.04em] text-shell-text sm:text-5xl">
            You already know the problem.
          </h2>
          <p className="mt-3 text-sm text-shell-text-muted sm:text-base">
            Every small business in Cambodia loses customers the same three ways.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PAIRS.map(({ problem, solution }) => (
            <div
              key={problem}
              className="group flex flex-col rounded-2xl border border-white/10 bg-slate-800 p-6 shadow-lg transition-colors duration-200 hover:border-accent/60 hover:bg-slate-800/90"
            >
              <p className="font-heading font-bold text-shell-text">{problem}</p>

              <div className="my-5 flex items-center gap-2 text-accent">
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                <Zap className="h-3.5 w-3.5" strokeWidth={2} />
              </div>

              <p className="text-sm text-shell-text-muted">{solution}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
