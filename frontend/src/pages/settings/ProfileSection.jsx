import { useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";
import SectionCard from "../../components/SectionCard";

const BUSINESS_TYPES = [
  { value: "clinic", label: "Clinic" },
  { value: "shop", label: "Shop" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

const LANGUAGES = [
  { value: "km", label: "Khmer" },
  { value: "en", label: "English" },
  { value: "both", label: "Auto-detect (Khmer + English)" },
];

const TIMEZONES = ["Asia/Phnom_Penh", "Asia/Bangkok", "Asia/Ho_Chi_Minh", "UTC"];

const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
];

const fieldClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
const labelClass = "mb-1 block text-sm font-medium text-ink";

function defaultHours() {
  const hours = {};
  for (const [key] of DAYS) {
    hours[key] = { open: "08:00", close: "17:00", closed: key === "sun" };
  }
  return hours;
}

export default function ProfileSection({ profile, onSaved, showToast }) {
  const [form, setForm] = useState({
    name: profile.name,
    business_type: profile.business_type,
    address: profile.address || "",
    phone: profile.phone || "",
    default_language: profile.default_language,
    timezone: profile.timezone,
    business_hours: profile.business_hours || defaultHours(),
    logo_url: profile.logo_url || "",
  });
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateHours(day, field, value) {
    setForm((f) => ({
      ...f,
      business_hours: {
        ...f.business_hours,
        [day]: { ...f.business_hours[day], [field]: value },
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await apiFetch("/settings/profile", {
        method: "PUT",
        body: {
          ...form,
          address: form.address || null,
          phone: form.phone || null,
          logo_url: form.logo_url || null,
        },
      });
      onSaved(updated);
      showToast("Business profile saved");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not save profile.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Business profile" description="Shown to your team, not to customers.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Company name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Business type</label>
          <select
            value={form.business_type}
            onChange={(e) => update("business_type", e.target.value)}
            className={fieldClass}
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Logo URL</label>
        <input
          type="text"
          value={form.logo_url}
          onChange={(e) => update("logo_url", e.target.value)}
          placeholder="https://..."
          className={fieldClass}
        />
      </div>

      <div>
        <label className={labelClass}>Address</label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Phone</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Default language</label>
          <select
            value={form.default_language}
            onChange={(e) => update("default_language", e.target.value)}
            className={fieldClass}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Timezone</label>
        <select
          value={form.timezone}
          onChange={(e) => update("timezone", e.target.value)}
          className={fieldClass}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Business hours</label>
        <div className="space-y-2 rounded-lg border border-gray-200 p-3">
          {DAYS.map(([key, label]) => {
            const day = form.business_hours[key] || { open: "08:00", close: "17:00", closed: false };
            return (
              <div key={key} className="flex flex-wrap items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-ink">{label}</span>
                <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    checked={day.closed}
                    onChange={(e) => updateHours(key, "closed", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  Closed
                </label>
                {!day.closed && (
                  <>
                    <input
                      type="time"
                      value={day.open || ""}
                      onChange={(e) => updateHours(key, "open", e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    <span className="text-sm text-ink-muted">to</span>
                    <input
                      type="time"
                      value={day.close || ""}
                      onChange={(e) => updateHours(key, "close", e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </SectionCard>
  );
}
