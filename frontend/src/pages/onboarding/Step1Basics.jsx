import { ArrowRight, CalendarCheck, Check, Eye, ShoppingBag, UserRound } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";

const BUSINESS_TYPES = [
  {
    value: "product_retail",
    label: "Product Retail",
    description: "E-commerce catalog, stock management, and order processing.",
    icon: ShoppingBag,
  },
  {
    value: "service_appointment",
    label: "Services & Leads",
    description: "Appointment booking, lead collection, and knowledge Q&A.",
    icon: CalendarCheck,
  },
];

const FALLBACK_BUSINESS_TYPES = {
  food_beverage: "Services & Leads",
  property_real_estate: "Services & Leads",
  education: "Services & Leads",
  professional_other: "Services & Leads",
};

const TEMPLATE_PREVIEWS = {
  service_appointment: [
    "Main appointment",
    "Follow-up appointment",
    "Popular service",
    "Cancellation policy",
  ],
  product_retail: [
    "Best-selling product",
    "New arrival",
    "Product variant or size",
    "Return or exchange policy",
  ],
  food_beverage: [
    "Signature dish or drink",
    "Breakfast item",
    "Family or combo set",
    "Delivery area and fee",
  ],
  property_real_estate: [
    "Available listing",
    "Studio or one-bedroom",
    "Property sale listing",
    "Deposit and lease terms",
  ],
  education: [
    "Main course or class",
    "Beginner or foundation course",
    "Private tutoring session",
    "Class schedule and age range",
  ],
  professional_other: [
    "Main service",
    "Popular service",
    "Payment or cancellation policy",
    "What customers should know",
  ],
};

const LANGUAGES = [
  { value: "km", label: "Khmer" },
  { value: "en", label: "English" },
  { value: "both", label: "Both Khmer and English" },
];

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-ink shadow-sm transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
const labelClass = "mb-1.5 block text-sm font-semibold text-ink";

const BusinessTypeCard = memo(function BusinessTypeCard({ option, selected, onSelect }) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className={`group flex min-h-36 flex-col rounded-2xl border p-4 text-left shadow-sm transition-all duration-150 ${
        selected
          ? "border-accent bg-accent-soft/35 shadow-[0_0_0_4px_rgba(34,197,94,0.08)]"
          : "border-slate-200 bg-white hover:border-accent/40 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
            selected
              ? "border-accent/30 bg-white text-accent-dark"
              : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border ${
            selected
              ? "border-accent bg-accent text-white"
              : "border-slate-300 bg-white text-transparent group-hover:border-accent/50"
          }`}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      </div>
      <p className="mt-4 font-heading text-base font-bold text-ink">{option.label}</p>
      <p className="mt-1 text-sm leading-5 text-ink-muted">{option.description}</p>
    </button>
  );
});

const TemplatePreview = memo(function TemplatePreview({ businessName, businessType, defaultLanguage }) {
  const previewItems = TEMPLATE_PREVIEWS[businessType] || TEMPLATE_PREVIEWS.professional_other;
  const greeting = businessName?.trim()
    ? `Hi! Welcome to ${businessName.trim()}. How can I help you today?`
    : "Hi! Welcome to your business. How can I help you today?";

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-dark">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <p className="font-heading text-sm font-bold text-ink">Assistant Preview</p>
                {/* <p className="text-xs text-ink-muted">Live starter experience</p> */}
              </div>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
              {defaultLanguage === "both" ? "Bilingual" : defaultLanguage.toUpperCase()}
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              Hello, do you have anything available?
            </div>
            <div className="ml-auto mt-3 max-w-[86%] rounded-2xl rounded-tr-md border border-accent/30 bg-accent-soft/50 px-4 py-3 text-sm font-medium text-accent-dark shadow-sm">
              {greeting}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-accent-dark shadow-sm ring-1 ring-slate-200">
                <Eye className="h-4 w-4" />
              </span>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Preview</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
              Template
            </span>
          </div>
          <p className="font-heading text-lg font-bold text-ink">
            Here's what we'll help you set up
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {previewItems.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
});

export default function Step1Basics({ status, onAdvance }) {
  const [businessName, setBusinessName] = useState(status.business_name);
  const [businessType, setBusinessType] = useState(status.business_type);
  const [defaultLanguage, setDefaultLanguage] = useState(status.default_language || "km");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedBusinessTypeLabel = useMemo(() => {
    return (
      BUSINESS_TYPES.find((option) => option.value === businessType)?.label ||
      FALLBACK_BUSINESS_TYPES[businessType] ||
      "Services & Leads"
    );
  }, [businessType]);

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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-7">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Step 1
          </span>
          <h1 className="mt-4 max-w-2xl font-heading text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Tell us about your business
          </h1>
          {/* <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
            We use this to prepare the right assistant flow, starter knowledge, and setup checklist.
          </p> */}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              className={fieldClass}
              placeholder="Sok Dara Shop"
            />
          </div>

          <div>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <label className={labelClass}>Business type</label>
                <p className="text-sm text-ink-muted">Selected: {selectedBusinessTypeLabel}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {BUSINESS_TYPES.map((option) => (
                <BusinessTypeCard
                  key={option.value}
                  option={option}
                  selected={businessType === option.value}
                  onSelect={setBusinessType}
                />
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
              {LANGUAGES.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 lg:hidden">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-accent-dark shadow-sm ring-1 ring-slate-200">
                <Eye className="h-4 w-4" />
              </span>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Preview</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(TEMPLATE_PREVIEWS[businessType] || TEMPLATE_PREVIEWS.professional_other).map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-slate-200 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-dark px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-soft-text disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {saving ? "Saving..." : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>

      <TemplatePreview
        businessName={businessName}
        businessType={businessType}
        defaultLanguage={defaultLanguage}
      />
    </div>
  );
}
