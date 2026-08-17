import { Link } from "react-router-dom";
import Logo from "../../components/Logo";

export default function LandingNav() {
  function scrollToDemo(e) {
    e.preventDefault();
    const el = document.getElementById("demo");
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-green-700 bg-green-500 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-8 sm:py-4">
        <a
          href="#top"
          className="flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-1.5 py-1 shadow-md sm:gap-2 sm:px-3 sm:py-1.5"
          aria-label="WeCare home"
        >
          <Logo className="h-9 w-14 sm:h-12 sm:w-20" />
          <span className="font-sans text-lg font-bold tracking-tight sm:text-2xl">
            <span className="text-accent">We</span>
            <span className="text-slate-500">Care</span>
          </span>
        </a>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <a
            href="#demo"
            onClick={scrollToDemo}
            className="hidden h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition-colors hover:bg-green-600 sm:inline-flex"
          >
            Live demo
          </a>
          <Link
            to="/app/signin"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-white/80 bg-white px-3 text-xs font-semibold text-green-700 shadow-sm transition-colors hover:bg-green-50 sm:px-4 sm:text-sm"
          >
            Sign in
          </Link>
          <Link
            to="/app/signup"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 sm:px-5 sm:text-sm"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </header>
  );
}
