import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Stepper from "../../components/Stepper";
import Step1Basics from "./Step1Basics";
import Step2Knowledge from "./Step2Knowledge";
import Step3Telegram from "./Step3Telegram";
import Step4GoLive from "./Step4GoLive";
import Logo from "../../components/Logo";

export default function Onboarding() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStatus() {
    try {
      const data = await apiFetch("/onboarding/status");
      setStatus(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load setup status.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="text-sm text-ink-muted">Loading...</p>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4">
        <p className="rounded-lg bg-error-soft px-4 py-3 text-sm text-error">
          {error || "Something went wrong."}
        </p>
      </div>
    );
  }

  const step = Math.min(Math.max(status.onboarding_step, 1), 4);

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-400 bg-gray-300 px-4 py-2 shadow-md">
            <Logo className="h-14 w-24 shrink-0" />
            <span className="truncate font-sans text-base font-bold text-slate-700">Set up your assistant</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <Stepper currentStep={step} />

        <div className={step === 4 ? "w-full" : "mx-auto w-full max-w-2xl"}>
        {step === 1 && <Step1Basics status={status} onAdvance={loadStatus} />}
        {step === 2 && <Step2Knowledge status={status} onAdvance={loadStatus} />}
        {step === 3 && <Step3Telegram status={status} onAdvance={loadStatus} />}
        {step === 4 && <Step4GoLive status={status} onAdvance={loadStatus} />}
        </div>
      </main>
    </div>
  );
}
