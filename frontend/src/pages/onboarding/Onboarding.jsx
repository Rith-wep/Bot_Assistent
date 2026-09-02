import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Stepper from "../../components/Stepper";
import Logo from "../../components/Logo";

const Step1Basics = lazy(() => import("./Step1Basics"));
const Step2Knowledge = lazy(() => import("./Step2Knowledge"));
const Step3Telegram = lazy(() => import("./Step3Telegram"));
const Step4GoLive = lazy(() => import("./Step4GoLive"));

function StepFallback() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-4 w-32 rounded-full bg-slate-100" />
      <div className="mt-5 h-8 w-2/3 rounded-full bg-slate-100" />
      <div className="mt-3 h-4 w-full max-w-md rounded-full bg-slate-100" />
      <div className="mt-8 grid gap-3">
        <div className="h-12 rounded-xl bg-slate-100" />
        <div className="h-12 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

export default function Onboarding() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const data = await apiFetch("/onboarding/status");
      setStatus(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load setup status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const step = Math.min(Math.max(status?.onboarding_step || 1, 1), 4);
  const goToStep = useCallback(
    (nextStep) =>
      setStatus((current) =>
        current ? { ...current, onboarding_step: Math.min(Math.max(nextStep, 1), 4) } : current
      ),
    []
  );

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

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:px-4">
              <Logo className="h-10 w-16 shrink-0 sm:h-12 sm:w-20" />
            </div>
            <div className="hidden sm:block">
              <p className="font-heading text-sm font-bold text-ink">Workspace setup</p>
              <p className="text-xs text-ink-muted">Step {step} of 4</p>
            </div>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
            Setup wizard
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <Stepper currentStep={step} />

        <div className="w-full">
          <Suspense fallback={<StepFallback />}>
            {step === 1 && <Step1Basics status={status} onAdvance={loadStatus} />}
            {step === 2 && (
              <Step2Knowledge status={status} onAdvance={loadStatus} onBack={() => goToStep(1)} />
            )}
            {step === 3 && (
              <Step3Telegram
                status={status}
                onAdvance={loadStatus}
                onBack={() => goToStep(2)}
                onSkip={() => goToStep(4)}
              />
            )}
            {step === 4 && <Step4GoLive status={status} onAdvance={loadStatus} onBack={() => goToStep(3)} />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
