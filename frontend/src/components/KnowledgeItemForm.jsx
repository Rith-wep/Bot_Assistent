import { useState } from "react";
import { ApiError } from "../api/client";
import Button from "./Button";

export const KNOWLEDGE_CATEGORIES = [
  { value: "service", label: "Service" },
  { value: "faq", label: "FAQ" },
  { value: "hours", label: "Opening Hours" },
  { value: "location", label: "Location" },
  { value: "policy", label: "Policy" },
  { value: "other", label: "Other" },
];

// Default form values for creating a new knowledge item
export const EMPTY_KNOWLEDGE_FORM = {
  category: "service",
  title: "",
  content_en: "",
  content_km: "",
  price: "",
  sort_order: 0,
};


const fieldClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
const labelClass = "mb-1 block text-sm font-medium text-ink";


export default function KnowledgeItemForm({ initial, onSubmit, onCancel, submitLabel }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        price: form.price || null,
        content_en: form.content_en || null,
        content_km: form.content_km || null,
        sort_order: Number(form.sort_order) || 0,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      {error && <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Category</label>
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className={fieldClass}
          >
            {KNOWLEDGE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Price (optional)</label>
          <input
            type="text"
            value={form.price ?? ""}
            onChange={(e) => update("price", e.target.value)}
            placeholder="e.g. $15 or $20 - $40"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Title</label>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. Teeth cleaning"
          className={fieldClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>English content</label>
          <textarea
            rows={3}
            value={form.content_en ?? ""}
            onChange={(e) => update("content_en", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Khmer content</label>
          <textarea
            rows={3}
            value={form.content_km ?? ""}
            onChange={(e) => update("content_km", e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
