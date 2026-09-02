import { Bot, Send } from "lucide-react";
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
    <section id="demo" className="landing-grid relative border-b border-landing-ink/10 py-20 sm:py-28">
      <div className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full bg-landing-lime blur-3xl" />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-8">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
            Live demo — real replies, no signup
          </div>
          <h2 className="text-balance font-heading text-3xl font-extrabold tracking-[-0.04em] text-landing-ink sm:text-5xl">
            Talk to Mekong Family Clinic's assistant
          </h2>
          {/* <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-landing-ink/60">
            This is a real fictional business, wired to the real product. Ask
            in Khmer or English — it replies in whichever language you use.
          </p> */}
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white shadow-xl sm:rounded-[2rem]">
          <div className="landing-noise flex items-center gap-3 border-b-2 border-landing-ink bg-landing-ink px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-landing-lime">
              <Bot className="h-5 w-5 text-landing-ink" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">Mekong Family Clinic</p>
              <p className="flex items-center gap-1.5 text-xs text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Usually replies instantly</p>
            </div>
          </div>

          <div className="flex h-80 flex-col gap-3 overflow-y-auto bg-white px-5 py-5 sm:h-96 sm:px-7">
            {history.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <p className="max-w-sm text-sm text-ink-muted">
                  Try asking about prices, hours, or services — try Khmer too.
                </p>
                <div className="flex w-full flex-col justify-center gap-2 sm:flex-row sm:flex-wrap">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-accent hover:bg-emerald-50 sm:w-auto"
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
                      ? "rounded-br-sm bg-landing-ink text-white"
                      : "rounded-bl-sm bg-landing-paper text-landing-ink"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-landing-paper px-3.5 py-2.5">
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

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 p-3 sm:p-4">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_LENGTH}
              placeholder="Type a question..."
              disabled={sending}
              className="w-full rounded-full border border-landing-ink/25 bg-white px-4 py-2.5 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white shadow-sm transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
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
