import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { getSupabase } from "../lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ password });
      if (updateError) throw updateError;
      navigate("/app");
    } catch (err) {
      setError(err?.message || "Unable to update your password. Please request a new link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-shell-border bg-surface p-6 shadow-xl"
      >
        <h1 className="text-center font-heading text-2xl font-bold text-shell-text">
          Choose a new password
        </h1>
        {error && <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>}
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-shell-border bg-base px-3 py-2.5 text-sm text-shell-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="New password"
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="w-full rounded-lg border border-shell-border bg-base px-3 py-2.5 text-sm text-shell-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Confirm new password"
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>
    </div>
  );
}
