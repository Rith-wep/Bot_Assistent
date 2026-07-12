import { CheckCircle2, ExternalLink, Loader2, Send, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";

const POLL_INTERVAL_MS = 3000;

function InstructionStep({ number, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-dark">
        {number}
      </div>
      <p className="text-sm text-ink">{children}</p>
    </div>
  );
}

export default function Step3Telegram({ onAdvance }) {
  const [loading, setLoading] = useState(true);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [token, setToken] = useState("");
  const [validation, setValidation] = useState(null); // { valid, bot_username, bot_name, error }
  const [validating, setValidating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const pollRef = useRef(null);

  async function loadTelegramStatus() {
    try {
      const data = await apiFetch("/onboarding/telegram/status");
      setTelegramStatus(data);
      return data;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTelegramStatus();
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (telegramStatus?.connected && !telegramStatus?.owner_linked) {
      pollRef.current = setInterval(async () => {
        const data = await loadTelegramStatus();
        if (data.owner_linked) clearInterval(pollRef.current);
      }, POLL_INTERVAL_MS);
      return () => clearInterval(pollRef.current);
    }
  }, [telegramStatus?.connected, telegramStatus?.owner_linked]);

  async function handleValidate() {
    setValidation(null);
    setValidating(true);
    try {
      const data = await apiFetch("/onboarding/telegram/validate-token", {
        method: "POST",
        body: { token: token.trim() },
      });
      setValidation(data);
    } catch (err) {
      setValidation({ valid: false, error: err instanceof ApiError ? err.message : "Could not validate." });
    } finally {
      setValidating(false);
    }
  }

  async function handleConnect() {
    setConnectError("");
    setConnecting(true);
    try {
      await apiFetch("/onboarding/telegram/connect", { method: "POST", body: { token: token.trim() } });
      await loadTelegramStatus();
    } catch (err) {
      setConnectError(err instanceof ApiError ? err.message : "Could not connect this bot.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleContinue() {
    setAdvancing(true);
    try {
      await apiFetch("/onboarding/step3/complete", { method: "POST" });
      await onAdvance();
    } finally {
      setAdvancing(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading...</p>;
  }

  // Owner already linked (or resuming after it happened)
  if (telegramStatus?.owner_linked) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Telegram connected</h1>
        <div className="mt-6 flex flex-col items-center rounded-xl border border-gray-200 bg-white p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-accent" strokeWidth={1.5} />
          <p className="mt-3 font-heading font-bold text-ink">@{telegramStatus.bot_username}</p>
          <p className="mt-1 text-sm text-ink-muted">You're linked as the owner of this bot.</p>
        </div>
        <div className="mt-6">
          <Button onClick={handleContinue} disabled={advancing} className="w-full sm:w-auto">
            {advancing ? "Continuing..." : "Continue"}
          </Button>
        </div>
      </div>
    );
  }

  // Bot connected, waiting for the owner to press START / send /myid
  if (telegramStatus?.connected) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Almost there</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your bot <span className="font-semibold text-ink">@{telegramStatus.bot_username}</span> is
          connected and running.
        </p>

        <div className="mt-6 flex flex-col items-center rounded-xl border border-gray-200 bg-white p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" strokeWidth={2} />
          <p className="mt-4 font-medium text-ink">
            Now open your new bot and press <span className="font-bold">START</span>, then send{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-accent-dark">/myid</code>
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Your ID will appear here automatically — this can take up to 30 seconds.
          </p>
          <a
            href={`https://t.me/${telegramStatus.bot_username}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-dark hover:underline"
          >
            Open @{telegramStatus.bot_username}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  // Not connected yet: instructions + token entry
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-ink">Connect your Telegram bot</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Your assistant lives inside a Telegram bot that you create and own.
      </p>

      <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <InstructionStep number="1">
          Open{" "}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-accent-dark hover:underline"
          >
            @BotFather <ExternalLink className="h-3.5 w-3.5" />
          </a>{" "}
          in Telegram.
        </InstructionStep>
        <InstructionStep number="2">
          Send <code className="rounded bg-gray-100 px-1.5 py-0.5">/newbot</code>
        </InstructionStep>
        <InstructionStep number="3">
          Choose a name and a username for your bot when asked.
        </InstructionStep>
        <InstructionStep number="4">
          BotFather will send you a <span className="font-semibold">token</span> — copy the whole
          thing and paste it below.
        </InstructionStep>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <label className="mb-1 block text-sm font-medium text-ink">Bot token</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setValidation(null);
            }}
            onPaste={() => setTimeout(handleValidate, 0)}
            placeholder="123456789:AAE..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <Button
            variant="secondary"
            onClick={handleValidate}
            disabled={validating || !token.trim()}
            className="shrink-0"
          >
            {validating ? "Checking..." : "Validate"}
          </Button>
        </div>

        {validation?.valid && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-soft-text">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Found <span className="font-semibold">{validation.bot_name}</span> (@
            {validation.bot_username})
          </div>
        )}
        {validation && !validation.valid && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">
            <XCircle className="h-4 w-4 shrink-0" />
            {validation.error}
          </div>
        )}
        {connectError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">
            <XCircle className="h-4 w-4 shrink-0" />
            {connectError}
          </div>
        )}

        <div className="mt-4">
          <Button onClick={handleConnect} disabled={!validation?.valid || connecting}>
            <Send className="h-4 w-4" strokeWidth={2.5} />
            {connecting ? "Connecting..." : "Connect this bot"}
          </Button>
        </div>
      </div>
    </div>
  );
}
