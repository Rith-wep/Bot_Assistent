import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";
import SectionCard from "../../components/SectionCard";

const PERSONALITIES = [
  ["professional", "Professional", "Clear, precise, and reassuring"],
  ["friendly", "Friendly", "Warm, approachable, and helpful"],
  ["casual", "Casual", "Relaxed and conversational"],
  ["luxury", "Luxury", "Polished and attentive"],
  ["sales", "Sales", "Energetic and gently conversion-focused"],
];

const fieldClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export default function AIProfileSection({ profile, rules, onProfileSaved, onRulesSaved, showToast, embedded = false }) {
  const [form, setForm] = useState({ ...profile });
  const [newRule, setNewRule] = useState("");
  const [saving, setSaving] = useState(false);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function saveProfile() {
    setSaving(true);
    try {
      const saved = await apiFetch("/settings/ai-profile", { method: "PUT", body: form });
      onProfileSaved(saved);
      showToast("AI profile saved");
    } catch (err) { showToast(err instanceof ApiError ? err.message : "Could not save profile.", "error"); }
    finally { setSaving(false); }
  }

  async function addRule() {
    if (!newRule.trim()) return;
    try {
      const rule = await apiFetch("/settings/business-rules", { method: "POST", body: { rule_text: newRule.trim(), sort_order: rules.length } });
      onRulesSaved([...rules, rule]);
      setNewRule("");
    } catch (err) { showToast(err instanceof ApiError ? err.message : "Could not add rule.", "error"); }
  }

  async function removeRule(id) {
    try { await apiFetch(`/settings/business-rules/${id}`, { method: "DELETE" }); onRulesSaved(rules.filter((rule) => rule.id !== id)); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "Could not remove rule.", "error"); }
  }

  const content = <>
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
      <h3 className="font-heading text-sm font-bold text-gray-900">Persona and rules</h3>
      <p className="mt-1 text-xs text-gray-500">Shape how your assistant speaks and what it must always remember.</p>
    </div>
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">Assistant name</label>
      <input className={fieldClass} value={form.assistant_name} onChange={(e) => update("assistant_name", e.target.value)} />
    </div>
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">Assistant role</label>
      <input className={fieldClass} value={form.assistant_role} onChange={(e) => update("assistant_role", e.target.value)} />
    </div>
    <div>
      <label className="mb-2 block text-sm font-medium text-ink">Personality</label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {PERSONALITIES.map(([value, label, description]) => <button key={value} type="button" onClick={() => update("personality", value)} className={`min-h-24 rounded-xl border p-3 text-left transition-all duration-150 hover:-translate-y-px hover:shadow-sm ${form.personality === value ? "border-accent bg-accent-soft ring-1 ring-accent/20" : "border-gray-100 bg-white hover:border-gray-200"}`}><span className="block text-sm font-semibold text-ink">{label}</span><span className="mt-1 block text-xs text-ink-muted">{description}</span></button>)}
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div><label className="mb-1 block text-sm font-medium text-ink">Response length</label><select className={fieldClass} value={form.response_length} onChange={(e) => update("response_length", e.target.value)}><option value="short">Short</option><option value="medium">Medium</option></select></div>
      <div><label className="mb-1 block text-sm font-medium text-ink">Language mode</label><select className={fieldClass} value={form.language_mode} onChange={(e) => update("language_mode", e.target.value)}><option value="mirror">Mirror customer language</option><option value="khmer_default">Khmer by default</option><option value="english">English</option><option value="both">Khmer + English</option></select></div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><textarea className={fieldClass} rows={3} placeholder="Greeting in English" value={form.greeting_message_en || ""} onChange={(e) => update("greeting_message_en", e.target.value || null)} /><textarea className={fieldClass} rows={3} placeholder="Greeting in Khmer" value={form.greeting_message_km || ""} onChange={(e) => update("greeting_message_km", e.target.value || null)} /></div>
    <Button onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save AI profile"}</Button>
    <div className="border-t border-gray-200 pt-4"><h3 className="text-sm font-semibold text-ink">Business rules</h3><p className="mt-1 text-xs text-ink-muted">Active rules are included in the assistant prompt in this order.</p><div className="mt-3 space-y-2">{rules.map((rule) => <div key={rule.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"><span className="text-sm text-ink">{rule.rule_text}</span><button type="button" onClick={() => removeRule(rule.id)} aria-label="Delete rule" className="text-ink-muted hover:text-error"><Trash2 className="h-4 w-4" /></button></div>)}</div><div className="mt-3 flex gap-2"><input className={fieldClass} value={newRule} onChange={(e) => setNewRule(e.target.value)} placeholder="e.g. Never mention competitor names" /><Button onClick={addRule}><Plus className="h-4 w-4" /> Add rule</Button></div></div>
  </>;

  return embedded ? content : <SectionCard title="AI profile and business rules" description="Shape how your assistant speaks and what it must always remember.">{content}</SectionCard>;
}
