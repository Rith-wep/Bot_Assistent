import { useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";
import SectionCard from "../../components/SectionCard";

const TONES = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "short", label: "Short answers" },
];

const fieldClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
const labelClass = "mb-1 block text-sm font-medium text-ink";

export default function AiBehaviorSection({ aiBehavior, onSaved, showToast }) {
  const [form, setForm] = useState({
    assistant_display_name: aiBehavior.assistant_display_name || "",
    welcome_message_en: aiBehavior.welcome_message_en || "",
    welcome_message_km: aiBehavior.welcome_message_km || "",
    tone: aiBehavior.tone,
    handoff_on_unsure: aiBehavior.handoff_on_unsure,
  });
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await apiFetch("/settings/ai-behavior", {
        method: "PUT",
        body: {
          ...form,
          assistant_display_name: form.assistant_display_name || null,
          welcome_message_en: form.welcome_message_en || null,
          welcome_message_km: form.welcome_message_km || null,
        },
      });
      onSaved(updated);
      showToast("Assistant behavior saved");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not save.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="AI assistant behavior">
      <div>
        <label className={labelClass}>Assistant display name</label>
        <input
          type="text"
          value={form.assistant_display_name}
          onChange={(e) => update("assistant_display_name", e.target.value)}
          placeholder="e.g. Nary"
          className={fieldClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Welcome message (English)</label>
          <textarea
            rows={3}
            value={form.welcome_message_en}
            onChange={(e) => update("welcome_message_en", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Welcome message (Khmer)</label>
          <textarea
            rows={3}
            value={form.welcome_message_km}
            onChange={(e) => update("welcome_message_km", e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Tone</label>
        <select value={form.tone} onChange={(e) => update("tone", e.target.value)} className={fieldClass}>
          {TONES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={form.handoff_on_unsure}
          onChange={(e) => update("handoff_on_unsure", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
        />
        Hand off to human when AI is unsure
      </label>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </SectionCard>
  );
}
