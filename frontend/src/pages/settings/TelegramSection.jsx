import { CheckCircle2, Copy, ExternalLink, XCircle } from "lucide-react";
import { useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";
import SectionCard from "../../components/SectionCard";
import { formatDate } from "../../utils/format";

export default function TelegramSection({ telegram, onSaved, showToast }) {
  const [token, setToken] = useState("");
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copied, setCopied] = useState(false);

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
    setConnecting(true);
    try {
      await apiFetch("/onboarding/telegram/connect", { method: "POST", body: { token: token.trim() } });
      const updated = await apiFetch("/settings");
      onSaved(updated.telegram);
      setToken("");
      setValidation(null);
      showToast("Telegram bot connected");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not connect this bot.", "error");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect this bot? Customers won't be able to reach your assistant until you connect a new one.")) {
      return;
    }
    setDisconnecting(true);
    try {
      const updated = await apiFetch("/settings/telegram/disconnect", { method: "POST" });
      onSaved(updated);
      showToast("Telegram bot disconnected");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not disconnect.", "error");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(`t.me/${telegram.bot_username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (telegram.connected) {
    return (
      <SectionCard title="Telegram bot">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-soft-text">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-sm font-medium text-accent-dark hover:underline"
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            t.me/{telegram.bot_username}
          </button>
        </div>

        <p className="text-sm text-ink-muted">
          Status: {telegram.is_active ? "Active (polling)" : "Inactive"}
          {telegram.last_started_at && ` · Last started ${formatDate(telegram.last_started_at)}`}
        </p>

        {!telegram.owner_linked && (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
            Open your bot and send <code className="rounded bg-white/60 px-1">/myid</code> to
            link yourself as the owner — otherwise lead and handoff notifications have nowhere
            to go.
          </p>
        )}

        <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
          {disconnecting ? "Disconnecting..." : "Disconnect"}
        </Button>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Telegram bot"
      description="Connect the Telegram bot your customers will message."
    >
      <ol className="space-y-1.5 text-sm text-ink">
        <li>
          1. Open{" "}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-accent-dark hover:underline"
          >
            @BotFather <ExternalLink className="h-3.5 w-3.5" />
          </a>{" "}
          in Telegram.
        </li>
        <li>
          2. Send <code className="rounded bg-gray-100 px-1.5 py-0.5">/newbot</code>
        </li>
        <li>3. Choose a name and username when asked.</li>
        <li>4. Copy the token BotFather sends you and paste it below.</li>
      </ol>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Bot token</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setValidation(null);
            }}
            placeholder="123456789:AAE..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <Button variant="secondary" onClick={handleValidate} disabled={validating || !token.trim()}>
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
      </div>

      <Button onClick={handleConnect} disabled={!validation?.valid || connecting}>
        {connecting ? "Connecting..." : "Connect"}
      </Button>
    </SectionCard>
  );
}
