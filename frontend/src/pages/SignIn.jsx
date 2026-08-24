import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSupabase } from "../lib/supabase";
import Button from "../components/Button";
import Logo from "../components/Logo";

export default function SignIn() {
  const { completeAuthentication } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: authError } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
      if (!data.session) throw new Error("No session was created");
      await completeAuthentication(data.session);
      navigate("/app");
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 rounded-2xl bg-gray-300 px-5 py-2 shadow-sm ring-1 ring-gray-400">
            <Logo className="h-28 w-auto" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-shell-text">Welcome back</h1>
          <p className="mt-1 text-sm text-shell-text-muted">Sign in to your dashboard</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-shell-border bg-surface p-6 shadow-xl"
        >
          {error && (
            <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-shell-text-muted">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-shell-border bg-base px-3 py-2.5 text-sm text-shell-text placeholder-shell-text-muted/60 transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="you@business.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-shell-text-muted">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-shell-border bg-base px-3 py-2.5 text-sm text-shell-text placeholder-shell-text-muted/60 transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Your password"
            />
            <div className="mt-2 text-right">
              <Link
                to="/app/forgot-password"
                className="text-xs font-semibold text-accent hover:text-accent-dark"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-shell-text-muted">
          Don't have an account?{" "}
          <Link to="/app/signup" className="font-semibold text-accent hover:text-accent-dark">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
