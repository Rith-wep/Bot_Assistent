import { Sparkles, Trash2, Wand2 } from "lucide-react";
import { useState } from "react";
import { apiFetch, ApiError } from "../api/client";
import Button from "./Button";
import { KNOWLEDGE_CATEGORIES } from "./KnowledgeItemForm";

const MAX_TEXT_LENGTH = 8000;

const fieldClass =
  "w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

let nextDraftId = 0;

function AiDraftedChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold text-warning">
      <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} />
      AI-drafted
    </span>
  );
}

function DraftCard({ draft, onChange, onRemove }) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 transition-opacity duration-150 ${draft.selected ? "" : "opacity-50"}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={draft.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
          className="mt-2 h-4 w-4 shrink-0 rounded border-gray-300 text-accent focus:ring-accent"
          aria-label="Include this item"
        />

        <div className="min-w-0 flex-1 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[9rem_1fr_7rem]">
            <select
              value={draft.category}
              onChange={(e) => onChange({ category: e.target.value })}
              className={fieldClass}
            >
              {KNOWLEDGE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Title"
              className={`${fieldClass} font-semibold`}
            />
            <input
              type="text"
              value={draft.price ?? ""}
              onChange={(e) => onChange({ price: e.target.value })}
              placeholder="Price"
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <label className="text-xs font-medium text-ink-muted">English</label>
                {draft.content_en_ai_generated && <AiDraftedChip />}
              </div>
              <textarea
                rows={2}
                value={draft.content_en ?? ""}
                onChange={(e) => onChange({ content_en: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <label className="text-xs font-medium text-ink-muted">Khmer</label>
                {draft.content_km_ai_generated && <AiDraftedChip />}
              </div>
              <textarea
                rows={2}
                value={draft.content_km ?? ""}
                onChange={(e) => onChange({ content_km: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        <button
          onClick={onRemove}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-error-soft hover:text-error"
          aria-label="Remove this item"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/**
 * "Quick add with AI" — paste raw business text, get back editable draft
 * knowledge items. Nothing is saved until the owner reviews and confirms.
 * Shared between the Knowledge page and onboarding step 2.
 */
export default function AiQuickAdd({ onSaved, onCancel, autoFocus }) {
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState(null); // null = not analyzed yet
  const [saving, setSaving] = useState(false);

  async function handleAnalyze() {
    setError("");
    setAnalyzing(true);
    try {
      const data = await apiFetch("/knowledge/ai-extract", { method: "POST", body: { text } });
      if (data.items.length === 0) {
        setError(
          "Couldn't find any usable business information in that text — try adding more detail."
        );
        return;
      }
      setDrafts(
        data.items.map((item) => ({
          ...item,
          localId: nextDraftId++,
          selected: true,
        }))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not analyze this text.");
    } finally {
      setAnalyzing(false);
    }
  }

  function updateDraft(localId, patch) {
    setDrafts((ds) => ds.map((d) => (d.localId === localId ? { ...d, ...patch } : d)));
  }

  function removeDraft(localId) {
    setDrafts((ds) => ds.filter((d) => d.localId !== localId));
  }

  function reset() {
    setDrafts(null);
    setText("");
    setError("");
  }

  const selectedCount = drafts?.filter((d) => d.selected).length ?? 0;

  async function handleAddSelected() {
    setError("");
    setSaving(true);
    try {
      const toAdd = drafts.filter((d) => d.selected);
      for (const d of toAdd) {
        await apiFetch("/knowledge", {
          method: "POST",
          body: {
            category: d.category,
            title: d.title,
            content_en: d.content_en || null,
            content_km: d.content_km || null,
            price: d.price || null,
            sort_order: 0,
          },
        });
      }
      await onSaved?.(toAdd.length);
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save some items. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (drafts === null) {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent-dark" strokeWidth={2} />
          <h3 className="font-heading font-bold text-ink">Add with AI</h3>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Paste anything about your business: your price list, Facebook About text, menu, or
          rough notes. Khmer or English or mixed.
        </p>

        <textarea
          rows={6}
          maxLength={MAX_TEXT_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Teeth cleaning $15, braces $800-1500. Open 8am-6pm Mon-Sat. Located near..."
          className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          autoFocus={autoFocus}
        />
        <div className="mt-1 text-right text-xs text-ink-muted">
          {text.length}/{MAX_TEXT_LENGTH}
        </div>

        {error && (
          <p className="mt-2 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <Button onClick={handleAnalyze} disabled={analyzing || !text.trim()}>
            <Wand2 className="h-4 w-4" strokeWidth={2.5} />
            {analyzing ? "Analyzing..." : "Analyze"}
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={analyzing}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-heading font-bold text-ink">Review AI suggestions</h3>
          <p className="mt-0.5 text-sm text-ink-muted">
            Nothing is saved yet — edit anything, remove what's wrong, then add.
          </p>
        </div>
        <button
          onClick={reset}
          className="shrink-0 text-sm font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
        >
          Start over
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
      )}

      <div className="mt-4 space-y-3">
        {drafts.map((d) => (
          <DraftCard
            key={d.localId}
            draft={d}
            onChange={(patch) => updateDraft(d.localId, patch)}
            onRemove={() => removeDraft(d.localId)}
          />
        ))}
        {drafts.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-ink-muted">
            All suggestions removed.
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button onClick={handleAddSelected} disabled={saving || selectedCount === 0}>
          {saving
            ? "Adding..."
            : selectedCount === drafts.length
              ? `Add all (${drafts.length})`
              : `Add selected (${selectedCount})`}
        </Button>
        <Button variant="ghost" onClick={reset} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
