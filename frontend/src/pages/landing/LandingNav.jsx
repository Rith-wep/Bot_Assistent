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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-base/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <a href="#top" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-heading text-sm font-extrabold text-white">
            K
          </div>
          <span className="font-heading text-sm font-bold text-shell-text">Khmer Assistant</span>
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="#demo"
            onClick={scrollToDemo}
            className="hidden rounded-lg px-3.5 py-2 text-sm font-semibold text-shell-text-muted transition-colors duration-150 hover:text-shell-text sm:block"
          >
            Live demo
          </a>
          <Link
            to="/app/signin"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-shell-text-muted transition-colors duration-150 hover:text-shell-text"
          >
            Sign in
          </Link>
          <Link
            to="/app/signup"
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-dark"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </header>
  );
}
