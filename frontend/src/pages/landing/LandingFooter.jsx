import { Send } from "lucide-react";
import Logo from "../../components/Logo";

export default function LandingFooter() {
  return (
    <footer className="landing-noise border-t-4 border-accent bg-landing-ink py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-md">
          <Logo className="h-16 w-28" />
          <span className="font-sans text-2xl font-bold tracking-tight">
            <span className="text-accent">We</span>
            <span className="text-slate-500">Care</span>
          </span>
        </div>

        {/* TODO: replace with the real company support Telegram handle before launch */}
        <a
          href="https://t.me/your_support_handle"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-shell-text-muted transition-colors duration-150 hover:text-shell-text"
        >
          <Send className="h-3.5 w-3.5" strokeWidth={2} />
          Contact us on Telegram
        </a>

        <p className="text-xs text-shell-text-muted">
          &copy; {new Date().getFullYear()} WeCare. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
