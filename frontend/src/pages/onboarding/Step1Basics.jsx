import { useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";

const BUSINESS_TYPES = [
  { value: "service_appointment", label: "Services and appointments" },
  { value: "product_retail", label: "Product retail" },
  { value: "food_beverage", label: "Food and beverage" },
  { value: "property_real_estate", label: "Property and real estate" },
  { value: "education", label: "Education" },
  { value: "professional_other", label: "Professional or other" },
];

const TEMPLATE_PREVIEWS = {
  service_appointment: ["Main appointment", "Follow-up appointment", "Popular service", "Cancellation policy"],
  product_retail: ["Best-selling product", "New arrival", "Product variant or size", "Return or exchange policy"],
  food_beverage: ["Signature dish or drink", "Breakfast item", "Family or combo set", "Delivery area and fee"],
  property_real_estate: ["Available listing", "Studio or one-bedroom", "Property sale listing", "Deposit and lease terms"],
  education: ["Main course or class", "Beginner or foundation course", "Private tutoring session", "Class schedule and age range"],
  professional_other: ["Main service", "Popular service", "Payment or cancellation policy", "What customers should know"],
};

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
      <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">Tell us about your business</h1>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        This helps us set up your assistant with the right tone and suggestions.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"
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

        <div className="rounded-2xl border border-accent/25 bg-accent-soft/40 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">Here's what we'll help you set up</p>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-dark">Preview</span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">Starter knowledge for this template:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TEMPLATE_PREVIEWS[businessType].map((item) => (
              <span key={item} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-ink">
                {item}
              </span>
            ))}
          </div>
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
