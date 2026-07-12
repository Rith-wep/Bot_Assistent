import { ArrowRight, MessagesSquare, MoonStar, UserX, Zap } from "lucide-react";

const PAIRS = [
  {
    icon: MoonStar,
    problem: "Customers message at 9pm — nobody answers.",
    solution: "Your assistant replies instantly, any time of day or night.",
  },
  {
    icon: MessagesSquare,
    problem: "Staff answer the same 10 questions all day.",
    solution: "Your assistant handles the repetitive questions on its own.",
  },
  {
    icon: UserX,
    problem: "Interested buyers disappear without leaving a number.",
    solution: "Every lead is captured and sent straight to your phone.",
  },
];

export default function ProblemSolution() {
  return (
    <section className="bg-base py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-balance font-heading text-3xl font-extrabold tracking-tight text-shell-text sm:text-4xl">
            You already know the problem.
          </h2>
          <p className="mt-3 text-sm text-shell-text-muted sm:text-base">
            Every small business in Cambodia loses customers the same three ways.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PAIRS.map(({ icon: Icon, problem, solution }) => (
            <div
              key={problem}
              className="flex flex-col rounded-2xl border border-white/10 bg-surface p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <Icon className="h-5 w-5 text-shell-text-muted" strokeWidth={1.75} />
              </div>
              <p className="mt-4 font-heading font-bold text-shell-text">{problem}</p>

              <div className="my-4 flex items-center gap-2 text-accent">
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
