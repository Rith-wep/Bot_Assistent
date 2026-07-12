import { Check, ExternalLink, PartyPopper, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";

function ChecklistRow({ done, children }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          done ? "bg-accent text-white" : "border-2 border-gray-300"
        }`}
      >
        {done && <Check className="h-3 w-3" strokeWidth={3} />}
      </div>
      <span className={`text-sm ${done ? "text-ink" : "text-ink-muted"}`}>{children}</span>
    </div>
  );
}

export default function Step4GoLive() {
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  const [goingLive, setGoingLive] = useState(false);
  const [goLiveError, setGoLiveError] = useState("");
  const [liveResult, setLiveResult] = useState(null);

  async function loadChecklist() {
    try {
      const data = await apiFetch("/onboarding/checklist");
      setChecklist(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load checklist.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChecklist();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function handleSend(e) {
    e.preventDefault();
    const message = draft.trim();
    if (!message) return;
    setDraft("");
    const nextHistory = [...history, { role: "customer", text: message }];
    setHistory(nextHistory);
    setSending(true);
    try {
      const data = await apiFetch("/onboarding/preview-chat", {
        method: "POST",
        body: { message, history },
      });
      setHistory([...nextHistory, { role: "bot", text: data.reply }]);
    } catch (err) {
      setHistory([
        ...nextHistory,
        { role: "bot", text: err instanceof ApiError ? err.message : "Something went wrong." },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleGoLive() {
    setGoLiveError("");
    setGoingLive(true);
    try {
      const data = await apiFetch("/onboarding/go-live", { method: "POST" });
      setLiveResult(data);
    } catch (err) {
      setGoLiveError(err instanceof ApiError ? err.message : "Could not go live.");
    } finally {
      setGoingLive(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading...</p>;
  if (error) return <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>;

  if (liveResult?.onboarding_completed) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
          <PartyPopper className="h-8 w-8 text-accent-dark" strokeWidth={1.75} />
        </div>
        <h1 className="mt-4 font-heading text-2xl font-bold text-ink">You're live!</h1>
        <p className="mt-2 max-w-sm text-sm text-ink-muted">
          Share your bot with customers — anyone who messages it now gets answered by your
          assistant.
        </p>
        <a
          href={`https://t.me/${liveResult.bot_username}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-dark"
        >
          @{liveResult.bot_username}
          <ExternalLink className="h-4 w-4" />
        </a>
        <button
          onClick={() => {
            // Full reload, not client-side navigate: the app's onboarding-completed
            // check only runs once on mount, and would otherwise still be stale here.
            window.location.href = "/app/dashboard";
          }}
          className="mt-6 text-sm font-medium text-ink-muted hover:text-ink"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  const allReady = checklist.knowledge_ready && checklist.bot_connected && checklist.owner_linked;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-ink">Test and go live</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Try asking your assistant a real question, then go live when you're happy.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-1 font-heading font-bold text-ink">Checklist</h2>
          <ChecklistRow done={checklist.knowledge_ready}>Knowledge added</ChecklistRow>
          <ChecklistRow done={checklist.bot_connected}>Bot connected</ChecklistRow>
          <ChecklistRow done={checklist.owner_linked}>Owner linked</ChecklistRow>

          {goLiveError && (
            <p className="mt-3 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">
              {goLiveError}
            </p>
          )}

          <Button
            onClick={handleGoLive}
            disabled={!allReady || goingLive}
            className="mt-4 w-full"
          >
            {goingLive ? "Going live..." : "Go live"}
          </Button>
        </div>

        <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-heading font-bold text-ink">Try it out</h2>
          <div className="flex-1 space-y-2 overflow-y-auto" style={{ maxHeight: 320 }}>
            {history.length === 0 && (
              <p className="text-sm text-ink-muted">
                Ask something a customer might ask — e.g. a price or your hours.
              </p>
            )}
            {history.map((m, i) => (
              <div key={i} className={`flex ${m.role === "customer" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "customer" ? "bg-gray-100 text-ink" : "bg-accent-soft text-accent-soft-text"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSend} className="mt-3 flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a question..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <Button type="submit" disabled={sending || !draft.trim()} className="shrink-0">
              <Send className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
