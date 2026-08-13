import { Link } from "react-router-dom";

export default function LandingNav() {
  function scrollToDemo(e) {
    e.preventDefault();
    const el = document.getElementById("demo");
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-landing-ink/10 bg-landing-paper/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-8 sm:py-4">
        <a href="#top" className="flex items-center gap-2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-landing-ink font-heading text-sm font-extrabold text-landing-lime">
            ខ
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-landing-paper bg-accent" />
          </div>
          <span className="hidden font-heading text-sm font-extrabold tracking-tight text-landing-ink min-[420px]:inline">Khmer Assistant</span>
        </a>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-3">
          <a
            href="#demo"
            onClick={scrollToDemo}
            className="hidden rounded-full px-3.5 py-2 text-sm font-semibold text-landing-ink/60 transition-colors hover:text-landing-ink sm:block"
          >
            Live demo
          </a>
          <Link
            to="/app/signin"
            className="rounded-full px-2.5 py-2 text-xs font-semibold text-landing-ink/60 transition-colors hover:text-landing-ink sm:px-3.5 sm:text-sm"
          >
            Sign in
          </Link>
          <Link
            to="/app/signup"
            className="rounded-full bg-landing-ink px-3 py-2 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 sm:px-4 sm:text-sm"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </header>
  );
}
