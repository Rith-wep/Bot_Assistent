import { Send } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="bg-base py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent font-heading text-xs font-extrabold text-white">
            K
          </div>
          <span className="font-heading text-sm font-bold text-shell-text">Khmer Assistant</span>
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
          &copy; {new Date().getFullYear()} Khmer Assistant. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
