import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSupabase } from "../lib/supabase";
import Button from "../components/Button";
import Logo from "../components/Logo";

const BUSINESS_TYPES = [
  { value: "clinic", label: "Clinic" },
  { value: "shop", label: "Shop" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

const inputClass =
  "w-full rounded-lg border border-shell-border bg-base px-3 py-2.5 text-sm text-shell-text placeholder-shell-text-muted/60 transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
const labelClass = "mb-1.5 block text-sm font-medium text-shell-text-muted";

export default function SignUp() {
  const { completeAuthentication } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("clinic");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const normalizedEmail = email.trim();
      const business = {
        business_name: businessName.trim(),
        business_type: businessType,
      };
      const { data, error: authError } = await getSupabase().auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: {
            ...business,
          },
        },
      });
      if (authError) throw authError;

      if (!data.session) {
        setConfirmationSent(true);
        return;
      }

      await completeAuthentication(data.session, business);
      navigate("/app");
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 rounded-2xl bg-gray-300 px-5 py-2 shadow-sm ring-1 ring-gray-400">
            <Logo className="h-28 w-auto" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-shell-text">Create your account</h1>
          <p className="mt-1 text-sm text-shell-text-muted">
            Set up your business's AI assistant
          </p>
        </div>

        {confirmationSent ? (
          <div className="rounded-2xl border border-shell-border bg-surface p-6 text-center shadow-xl">
            <h2 className="font-heading text-lg font-bold text-shell-text">Check your email</h2>
            <p className="mt-2 text-sm text-shell-text-muted">
              We sent a secure confirmation link to {email}. Open it to finish setting up your
              account.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-shell-border bg-surface p-6 shadow-xl"
          >
          {error && (
            <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
          )}

          <div>
            <label className={labelClass}>Business name</label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={inputClass}
              placeholder="Sok Dara Dental Clinic"
            />
          </div>

          <div>
            <label className={labelClass}>Business type</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className={inputClass}
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-base">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@business.com"
            />
          </div>

          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 8 characters"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account..." : "Create account"}
          </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-shell-text-muted">
          Already have an account?{" "}
          <Link to="/app/signin" className="font-semibold text-accent hover:text-accent-dark">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
