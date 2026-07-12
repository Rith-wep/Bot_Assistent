import { Check, ChevronRight, Copy, Send } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

export default function StartConversationCard({ botUsername, telegramConnected }) {
  const [copied, setCopied] = useState(false);
  const link = telegramConnected && botUsername ? `https://t.me/${botUsername}` : null;

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-gray-200 bg-white p-6 text-center sm:flex-row sm:text-left">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft">
        <Send className="h-6 w-6 text-accent-dark" strokeWidth={1.75} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-heading font-bold text-ink">Your assistant hasn't talked to anyone yet</h3>
        {link ? (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              Share this link (or the QR code) so customers can start chatting right away.
            </p>
            <button
              onClick={handleCopy}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-dark"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : `@${botUsername}`}
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              Connect your Telegram bot to get a shareable link.
            </p>
            <Link
              to="/app/settings"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent-dark hover:underline"
            >
              Connect Telegram bot
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </>
        )}
      </div>

      {link && (
        <div className="shrink-0 rounded-lg border border-gray-200 p-2">
          <QRCodeSVG value={link} size={84} fgColor="#111827" bgColor="#ffffff" level="M" />
        </div>
      )}
    </div>
  );
}
