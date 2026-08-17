import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import { getSupabase } from "../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/app/reset-password` }
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err?.message || "Unable to send the reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-heading text-2xl font-bold text-shell-text">
          Reset your password
        </h1>
        <p className="mt-2 text-center text-sm text-shell-text-muted">
          Enter your email to receive a secure reset link.
        </p>

        {sent ? (
          <div className="mt-6 rounded-2xl border border-shell-border bg-surface p-6 text-center shadow-xl">
            <p className="text-sm text-shell-text-muted">
              If an account exists for this email, a reset link has been sent.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4 rounded-2xl border border-shell-border bg-surface p-6 shadow-xl"
          >
            {error && <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>}
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-shell-border bg-base px-3 py-2.5 text-sm text-shell-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="you@business.com"
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-shell-text-muted">
          <Link to="/app/signin" className="font-semibold text-accent hover:text-accent-dark">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
