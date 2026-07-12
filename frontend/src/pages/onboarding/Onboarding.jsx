import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "../../api/client";
import Stepper from "../../components/Stepper";
import { useAuth } from "../../context/AuthContext";
import Step1Basics from "./Step1Basics";
import Step2Knowledge from "./Step2Knowledge";
import Step3Telegram from "./Step3Telegram";
import Step4GoLive from "./Step4GoLive";

export default function Onboarding() {
  const { logout } = useAuth();
  const navigate = useNavigate();
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

  function handleSignOut() {
    logout();
    navigate("/app/signin");
  }

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
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-heading text-sm font-extrabold text-white">
            K
          </div>
          <span className="font-heading text-sm font-bold text-ink">Set up your assistant</span>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
        >
          Sign out
        </button>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
        <Stepper currentStep={step} />

        {step === 1 && <Step1Basics status={status} onAdvance={loadStatus} />}
        {step === 2 && <Step2Knowledge status={status} onAdvance={loadStatus} />}
        {step === 3 && <Step3Telegram status={status} onAdvance={loadStatus} />}
        {step === 4 && <Step4GoLive status={status} onAdvance={loadStatus} />}
      </main>
    </div>
  );
}
