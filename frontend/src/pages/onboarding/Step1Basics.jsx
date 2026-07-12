import { useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";

const BUSINESS_TYPES = [
  { value: "clinic", label: "Clinic" },
  { value: "shop", label: "Shop" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

const LANGUAGES = [
  { value: "km", label: "Khmer" },
  { value: "en", label: "English" },
  { value: "both", label: "Both Khmer and English" },
];

const fieldClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
const labelClass = "mb-1 block text-sm font-medium text-ink";

export default function Step1Basics({ status, onAdvance }) {
  const [businessName, setBusinessName] = useState(status.business_name);
  const [businessType, setBusinessType] = useState(status.business_type);
  const [defaultLanguage, setDefaultLanguage] = useState(status.default_language || "km");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiFetch("/onboarding/step1", {
        method: "PUT",
        body: {
          business_name: businessName,
          business_type: businessType,
          default_language: defaultLanguage,
        },
      });
      await onAdvance();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-ink">Tell us about your business</h1>
      <p className="mt-1 text-sm text-ink-muted">
        This helps us set up your assistant with the right tone and suggestions.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6"
      >
        {error && <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>}

        <div>
          <label className={labelClass}>Business name</label>
          <input
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Business type</label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className={fieldClass}
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Language your customers use</label>
          <select
            value={defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value)}
            className={fieldClass}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving..." : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
