import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Loader2,
  MessageCircle,
  MessageSquarePlus,
  Send,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";
import Skeleton from "../../components/Skeleton";

const POLL_INTERVAL_MS = 3000;

const INSTRUCTIONS = [
  {
    title: "Open @BotFather",
    icon: MessageCircle,
    action: "Open BotFather",
  },
  {
    title: "Send the command",
    icon: MessageSquarePlus,
    code: "/newbot",
  },
  {
    title: "Choose name and username",
    icon: UserRound,
  },
  {
    title: "Copy the token",
    icon: ClipboardCopy,
  },
];

const TimelineStep = memo(function TimelineStep({ step, index }) {
  const Icon = step.icon;

  return (
    <div className="relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {index < INSTRUCTIONS.length - 1 && (
        <span className="absolute left-8 top-14 h-8 w-px bg-slate-200" aria-hidden="true" />
      )}
      <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft/50 text-accent-dark">
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-heading text-sm font-bold text-ink">{step.title}</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            Step {index + 1}
          </span>
        </div>
        {step.action && (
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-accent/40 hover:text-accent-dark"
          >
            {step.action}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {step.code && (
          <code className="mt-3 inline-flex rounded bg-slate-100 px-2 py-0.5 font-mono text-sm text-slate-800">
            {step.code}
          </code>
        )}
      </div>
    </div>
  );
});

function Step3Skeleton() {
  return (
    <div className="w-full pb-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="mt-4 h-8 w-64 max-w-full" />
          <div className="mt-6 grid gap-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="mb-3 h-4 w-40 max-w-full" />
                  <Skeleton className="h-7 w-28 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-5 w-36" />
            </div>
            <Skeleton className="mt-5 h-10 w-full" />
            <Skeleton className="mt-3 h-10 w-full" />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function Step3Telegram({
  cachedTelegramStatus,
  onTelegramStatusChange,
  onChecklistStale,
  onAdvance,
  onBack,
  onSkip,
}) {
  const [loading, setLoading] = useState(!cachedTelegramStatus);
  const [telegramStatus, setTelegramStatus] = useState(cachedTelegramStatus);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const pollRef = useRef(null);

  const loadTelegramStatus = useCallback(async () => {
    try {
      const data = await apiFetch("/onboarding/telegram/status");
      setTelegramStatus(data);
      onTelegramStatusChange?.(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, [onTelegramStatusChange]);

  useEffect(() => {
    if (cachedTelegramStatus) {
      setTelegramStatus(cachedTelegramStatus);
      setLoading(false);
      return undefined;
    }

    loadTelegramStatus();
    return () => clearInterval(pollRef.current);
  }, [cachedTelegramStatus, loadTelegramStatus]);

  useEffect(() => {
    clearInterval(pollRef.current);

    if (telegramStatus?.connected && !telegramStatus?.owner_linked) {
      pollRef.current = setInterval(async () => {
        const data = await loadTelegramStatus();
        if (data.owner_linked) clearInterval(pollRef.current);
      }, POLL_INTERVAL_MS);
    }

    return () => clearInterval(pollRef.current);
  }, [loadTelegramStatus, telegramStatus?.connected, telegramStatus?.owner_linked]);

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
      setValidation({
        valid: false,
        error: err instanceof ApiError ? err.message : "Could not validate.",
      });
    } finally {
      setValidating(false);
    }
  }

  async function handleConnect() {
    setConnectError("");
    setConnecting(true);
    try {
      await apiFetch("/onboarding/telegram/connect", {
        method: "POST",
        body: { token: token.trim() },
      });
      onChecklistStale?.();
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
      const nextStatus = await apiFetch("/onboarding/step3/complete", { method: "POST" });
      onAdvance(nextStatus);
    } finally {
      setAdvancing(false);
    }
  }

  const tokenReady = token.trim().length > 0;

  if (loading) {
    return <Step3Skeleton />;
  }

  if (telegramStatus?.owner_linked) {
    return (
      <div className="w-full pb-8">
        <div className="rounded-3xl border border-accent/25 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft">
            <CheckCircle2 className="h-9 w-9 text-accent-dark" strokeWidth={1.75} />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Telegram connected
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            You're linked as the owner of{" "}
            <span className="font-semibold text-ink">@{telegramStatus.bot_username}</span>.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <Button
              onClick={handleContinue}
              isLoading={advancing}
              loadingLabel="Continuing..."
              className="min-w-36"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (telegramStatus?.connected) {
    return (
      <div className="w-full pb-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <span className="rounded-full border border-accent/25 bg-accent-soft/45 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-dark">
              Connected
            </span>
            <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Almost there
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Your bot <span className="font-semibold text-ink">@{telegramStatus.bot_username}</span>{" "}
              is connected and running.
            </p>
            <div className="mt-6 flex flex-col items-center rounded-2xl border border-accent/25 bg-accent-soft/20 p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent-dark" strokeWidth={2} />
              <p className="mt-4 font-medium text-ink">
                Open your new bot, press <span className="font-bold">START</span>, then send{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-accent-dark shadow-sm">
                  /myid
                </code>
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                Your ID will appear here automatically. This can take up to 30 seconds.
              </p>
              <a
                href={`https://t.me/${telegramStatus.bot_username}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-soft-text"
              >
                Open @{telegramStatus.bot_username}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 shadow-sm">
            <div className="flex h-full flex-col justify-center rounded-2xl border border-slate-200 bg-white p-5">
              <ShieldCheck className="h-8 w-8 text-accent-dark" />
              <h2 className="mt-3 font-heading text-lg font-bold text-ink">Owner verification</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                We keep checking in the background. Once your owner ID is linked, this step unlocks
                automatically.
              </p>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Step 3
          </span>
          <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Connect your Telegram bot
          </h1>
          {/* <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            Create your bot in Telegram, verify the token here, then connect it to this workspace.
          </p> */}

          <div className="mt-6 grid gap-3">
            {INSTRUCTIONS.map((stepItem, index) => (
              <TimelineStep key={stepItem.title} step={stepItem} index={index} />
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft/50 text-accent-dark">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-heading text-lg font-bold text-ink">Verify bot token</h2>
                {/* <p className="text-sm text-ink-muted">We check the bot before connecting it.</p> */}
              </div>
            </div>

            <label className="mb-1.5 mt-5 block text-sm font-semibold text-ink">Bot token</label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 transition-colors focus-within:border-accent focus-within:bg-white focus-within:ring-1 focus-within:ring-accent">
              <div className="flex items-center gap-2">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setValidation(null);
                  }}
                  onPaste={() => setTimeout(handleValidate, 0)}
                  placeholder="123456789:AAE..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 font-mono text-sm text-ink outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((visible) => !visible)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-ink"
                  aria-label={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  onClick={handleValidate}
                  disabled={!tokenReady}
                  isLoading={validating}
                  loadingLabel="Checking..."
                  className="w-full border-slate-200 sm:w-auto"
                >
                  Validate
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={!validation?.valid}
                  isLoading={connecting}
                  loadingLabel="Connecting..."
                  className="w-full bg-accent-dark font-medium hover:bg-accent-soft-text sm:flex-1"
                >
                  <Send className="h-4 w-4" strokeWidth={2.5} />
                  Connect bot
                </Button>
              </div>
            </div>

            {validation?.valid && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent/25 bg-accent-soft/45 px-3 py-2.5 text-sm text-accent-soft-text">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Bot verified: <span className="font-semibold">@{validation.bot_username}</span>
                  {validation.bot_name ? ` (${validation.bot_name})` : ""}
                </span>
              </div>
            )}
            {validation && !validation.valid && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-error-soft px-3 py-2.5 text-sm text-error">
                <XCircle className="h-4 w-4 shrink-0" />
                {validation.error}
              </div>
            )}
            {connectError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-error-soft px-3 py-2.5 text-sm text-error">
                <XCircle className="h-4 w-4 shrink-0" />
                {connectError}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-accent-dark shadow-sm ring-1 ring-slate-200">
                <HelpCircle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-heading text-sm font-bold text-ink">Need help?</h3>
                <p className="mt-1 text-sm leading-6 text-ink-muted">
                  The token is the long value with a colon in the middle, not the bot username.
                </p>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-dark hover:underline"
                >
                  Open quick setup helper
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="hidden min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-ink sm:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <Button
              onClick={handleContinue}
              disabled
              title="Connect your bot and link the owner before continuing."
              className="w-full"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
            <div className="hidden sm:block">
              <Button
                onClick={handleContinue}
                disabled
                title="Connect your bot and link the owner before continuing."
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
