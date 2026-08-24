import { useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";
import SectionCard from "../../components/SectionCard";

const BUSINESS_TYPES = [
  { value: "service_appointment", label: "Services and appointments" },
  { value: "product_retail", label: "Product retail" },
  { value: "food_beverage", label: "Food and beverage" },
  { value: "property_real_estate", label: "Property and real estate" },
  { value: "education", label: "Education" },
  { value: "professional_other", label: "Professional or other" },
];

const LANGUAGES = [
  { value: "km", label: "Khmer" },
  { value: "en", label: "English" },
  { value: "both", label: "Auto-detect (Khmer + English)" },
];

const TIMEZONES = ["Asia/Phnom_Penh", "Asia/Bangkok", "Asia/Ho_Chi_Minh", "UTC"];
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

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
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      showToast("Cloudinary upload is not configured.", "error");
      return;
    }
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      showToast("Choose an image smaller than 5 MB.", "error");
      return;
    }

    setUploadingLogo(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body },
      );
      const data = await response.json();
      if (!response.ok || !data.secure_url) throw new Error(data.error?.message || "Upload failed");
      update("logo_url", data.secure_url);
      showToast("Logo uploaded. Save the profile to apply it.");
    } catch (err) {
      showToast(err.message || "Could not upload logo.", "error");
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
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
          <label className={labelClass}>Business logo</label>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Business logo preview" className="h-16 w-16 rounded-lg border border-gray-200 bg-white object-contain p-1" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs text-ink-muted">No logo</div>
            )}
            <div>
              <label className="inline-flex cursor-pointer items-center rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark">
                {uploadingLogo ? "Uploading..." : "Upload image"}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} disabled={uploadingLogo} className="sr-only" />
              </label>
              <p className="mt-1 text-xs text-ink-muted">PNG, JPG, or WebP. Maximum 5 MB.</p>
            </div>
          </div>
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
