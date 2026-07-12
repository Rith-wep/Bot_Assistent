import { Bot, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";

const SUGGESTIONS = [
  "How much for a general consultation?",
  "What are your opening hours?",
  "តើមានវេជ្ជបញ្ជាទេ?",
];

const MAX_LENGTH = 300;

export default function LiveDemo() {
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [history, sending]);

  async function sendMessage(text) {
    const message = text.trim();
    if (!message || sending) return;
    setError("");
    setDraft("");
    const nextHistory = [...history, { role: "customer", text: message }];
    setHistory(nextHistory);
    setSending(true);
    try {
      const data = await apiFetch("/demo/chat", {
        method: "POST",
        auth: false,
        body: { message, history },
      });
      setHistory([...nextHistory, { role: "bot", text: data.reply }]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("This demo is popular right now — please wait a few minutes and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(draft);
  }

  return (
    <section id="demo" className="bg-page py-20 sm:py-28">
      <div className="mx-auto max-w-2xl px-5 sm:px-8">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-soft-text">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            Live demo — real replies, no signup
          </div>
          <h2 className="text-balance font-heading text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Talk to Mekong Family Clinic's assistant
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-muted">
            This is a real fictional business, wired to the real product. Ask
            in Khmer or English — it replies in whichever language you use.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft">
              <Bot className="h-4 w-4 text-accent-dark" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">Mekong Family Clinic</p>
              <p className="text-xs text-ink-muted">Usually replies instantly</p>
            </div>
          </div>

          <div className="flex h-80 flex-col gap-2.5 overflow-y-auto px-4 py-4 sm:h-96">
            {history.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-ink-muted">
                  Try asking about prices, hours, or services — try Khmer too.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors duration-150 hover:border-accent/40 hover:bg-accent-soft"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "customer" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.role === "customer"
                      ? "bg-accent text-white"
                      : "bg-gray-100 text-ink"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {error && (
            <p className="border-t border-gray-100 bg-error-soft px-4 py-2 text-xs text-error">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-gray-100 p-3">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_LENGTH}
              placeholder="Type a question..."
              disabled={sending}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-colors duration-150 hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
