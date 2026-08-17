import { ArrowRight, CheckCheck, MessageCircle, Send, Sparkles } from "lucide-react";
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
    <section id="top" className="landing-grid relative border-b border-landing-ink/10">
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-landing-lime/70 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-12 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
        <div>
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 shadow-sm sm:px-4">
            {/* <Sparkles className="h-3.5 w-3.5" /> */}
            <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] sm:text-xs sm:tracking-[0.14em]">Built for Cambodian businesses</span>
          </div>
          <h1 className="max-w-3xl text-balance font-heading text-4xl font-extrabold leading-[1.02] tracking-[-0.05em] text-landing-ink min-[390px]:text-5xl sm:text-7xl">
            Every message becomes a <span className="hero-accent-outline text-landing-blue">business chance.</span>
          </h1>
          <p className="mt-7 max-w-xl text-balance text-base leading-7 text-landing-ink/65 sm:text-lg">
            Your always-on AI front desk speaks Khmer, English, and Chinese, answers instantly, and sends qualified leads straight to your phone.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#demo" onClick={scrollToDemo} className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-accent-dark sm:w-auto">
              <MessageCircle className="h-4 w-4" /> Try the live demo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <Link to="/app/signin" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto">
              <Send className="h-4 w-4" /> Sign in
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-landing-ink/55"><CheckCheck className="h-4 w-4 text-accent-dark" /> Setup in 15 minutes · No credit card</p>
        </div>

        <div className="relative mx-auto w-[calc(100%-8px)] max-w-lg lg:mx-0">
          <div className="absolute -right-4 -top-6 hidden h-32 w-32 rounded-full bg-landing-blue sm:block" />
          <div className="landing-float relative overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white shadow-2xl sm:rounded-[2rem]">
            <div className="landing-noise flex items-center justify-between bg-landing-blue px-5 py-4 text-white">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-landing-lime font-heading font-extrabold text-landing-ink">ម</span><div><p className="text-sm font-bold">Mekong Clinic AI</p><p className="text-xs text-white/70">online now</p></div></div>
              <span className="h-2.5 w-2.5 rounded-full bg-landing-lime shadow-[0_0_0_5px_rgba(184,243,74,.2)]" />
            </div>
            <div className="space-y-3 p-4 sm:space-y-4 sm:p-7">
              <div className="ml-auto max-w-[78%] rounded-[1.25rem_1.25rem_.25rem_1.25rem] bg-landing-ink px-4 py-3 text-sm text-white">តើគ្លីនិកបើកម៉ោងប៉ុន្មាន?</div>
              <div className="max-w-[85%] rounded-[1.25rem_1.25rem_1.25rem_.25rem] bg-landing-paper px-4 py-3 text-sm leading-6 text-landing-ink">យើងបើករៀងរាល់ថ្ងៃ ពីម៉ោង 8 ព្រឹក ដល់ 7 យប់។ តើខ្ញុំអាចជួយកក់ពេលឱ្យអ្នកបានទេ?</div>
              <div className="ml-auto max-w-[70%] rounded-[1.25rem_1.25rem_.25rem_1.25rem] bg-landing-ink px-4 py-3 text-sm text-white">Yes, tomorrow morning.</div>
              <div className="flex items-center gap-2 rounded-xl border border-accent/25 bg-accent-soft p-3 text-xs font-bold text-accent-soft-text"><CheckCheck className="h-4 w-4" /> New lead captured and sent to Telegram</div>
            </div>
          </div>
          <div className="absolute -right-1 bottom-5 rotate-3 rounded-full border-2 border-landing-ink bg-landing-lime px-3 py-1.5 text-[10px] font-extrabold shadow-[2px_2px_0_#1e2130] sm:-right-5 sm:bottom-10 sm:rotate-6 sm:px-4 sm:py-2 sm:text-xs">24/7 reply ⚡</div>
        </div>
      </div>
    </section>
  );
}
