import { ArrowRight, MessageCircle, Send } from "lucide-react";
import { Link } from "react-router-dom";

function scrollToDemo(e) {
  e.preventDefault();
  const el = document.getElementById("demo");
  if (!el) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-base">
      {/* Ambient glow — decorative only, motion-safe (no animation, just a static gradient) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[560px] w-[560px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(34,197,94,0.35) 0%, rgba(34,197,94,0) 70%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-5 pb-20 pt-16 text-center sm:px-8 sm:pb-28 sm:pt-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="text-xs font-medium text-shell-text-muted">
            Your assistant is online right now — try it below
          </span>
        </div>

        <h1 className="text-balance font-heading text-4xl font-extrabold leading-[1.1] tracking-tight text-shell-text sm:text-6xl">
          A receptionist that never sleeps.
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-balance text-base text-shell-text-muted sm:text-lg">
          Your AI assistant answers customers in Khmer, English, and Chinese —
          24 hours a day — and sends every lead straight to your phone the
          moment it happens.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#demo"
            onClick={scrollToDemo}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-dark sm:w-auto"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
            Try the live demo
            <ArrowRight
              className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
              strokeWidth={2.5}
            />
          </a>
          <Link
            to="/app/signin"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-shell-text transition-colors duration-150 hover:bg-white/5 sm:w-auto"
          >
            <Send className="h-4 w-4" strokeWidth={2} />
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
