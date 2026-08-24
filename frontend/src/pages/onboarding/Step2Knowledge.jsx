import { ArrowRight, Check, FileUp, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import AiQuickAdd from "../../components/AiQuickAdd";
import Button from "../../components/Button";
import KnowledgeItemForm, { EMPTY_KNOWLEDGE_FORM } from "../../components/KnowledgeItemForm";
import { RowListSkeleton } from "../../components/Skeleton";

function SuggestionRow({ title, category, onAdd, onSkip }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3.5 last:border-b-0">
      <span className="text-sm font-medium text-ink">{title}</span>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => onAdd(category, title)}
          className="rounded-md px-2 py-1 text-sm font-semibold text-accent-dark hover:bg-accent-soft"
        >
          Add
        </button>
        <button
          onClick={() => onSkip(title)}
          className="rounded-md px-2 py-1 text-sm font-medium text-ink-muted hover:bg-gray-100 hover:text-ink"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function AddedRow({ item }) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3.5 last:border-b-0">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft">
        <Check className="h-3 w-3 text-accent-dark" strokeWidth={3} />
      </div>
      <span className="text-sm font-medium text-ink">{item.title}</span>
      {item.price && <span className="text-sm font-semibold text-accent-dark">{item.price}</span>}
    </div>
  );
}

export default function Step2Knowledge({ onAdvance }) {
  const [items, setItems] = useState([]);
  const [templates, setTemplates] = useState({ starter_items: [], faqs: [] });
  const [aiProfile, setAiProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [advanceError, setAdvanceError] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [skipped, setSkipped] = useState(new Set());
  const [openForm, setOpenForm] = useState(null); // { category, title } | "custom" | null
  const [showAiAdd, setShowAiAdd] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  async function loadAll(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const [itemsData, templatesData, settingsData] = await Promise.all([
        apiFetch("/knowledge"),
        apiFetch("/onboarding/templates"),
        apiFetch("/settings"),
      ]);
      setItems(itemsData);
      setTemplates(templatesData);
      setAiProfile(settingsData.ai_profile);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load knowledge setup.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleCreate(values) {
    await apiFetch("/knowledge", { method: "POST", body: values });
    setOpenForm(null);
    await loadAll(false);
  }

  async function handleAiSaved() {
    setShowAiAdd(false);
    await loadAll(false);
  }

  async function handleContinue() {
    setAdvanceError("");
    setAdvancing(true);
    try {
      await apiFetch("/onboarding/step2/complete", { method: "POST" });
      await onAdvance();
    } catch (err) {
      setAdvanceError(err instanceof ApiError ? err.message : "Could not continue.");
    } finally {
      setAdvancing(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const saved = await apiFetch("/settings/ai-profile", { method: "PUT", body: aiProfile });
      setAiProfile(saved);
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading) return <RowListSkeleton rows={4} />;
  if (error) return <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>;

  const locationItem = items.find((i) => i.category === "location");
  const hoursItem = items.find((i) => i.category === "hours");
  const isAdded = (title) => items.some((i) => i.title.toLowerCase() === title.toLowerCase());

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-dark">Business setup</p>
      <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">Add your business knowledge</h1>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        Your assistant only answers from what you add here. Location and hours are required;
        add at least one service or FAQ too.
      </p>

      {aiProfile && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-base font-bold text-ink">Meet your assistant</h2>
              <p className="mt-1 text-sm text-ink-muted">Set the starting voice for your customer replies.</p>
            </div>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-dark">Optional</span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">These starter settings come from your business type. You can refine them later in Settings.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={aiProfile.assistant_name} onChange={(e) => setAiProfile({ ...aiProfile, assistant_name: e.target.value })} placeholder="Assistant name" />
            <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={aiProfile.personality} onChange={(e) => setAiProfile({ ...aiProfile, personality: e.target.value })}><option value="professional">Professional</option><option value="friendly">Friendly</option><option value="casual">Casual</option><option value="luxury">Luxury</option><option value="sales">Sales</option></select>
          </div>
          <p className="mt-4 border-t border-gray-100 pt-4 text-xs font-semibold uppercase tracking-wider text-accent-dark">Starter rules</p>
          <ul className="mt-2 space-y-1 text-sm text-ink">{templates.default_rules?.map((rule) => <li key={rule}>• {rule}</li>)}</ul>
          <button type="button" onClick={saveProfile} disabled={savingProfile} className="mt-4 rounded-lg border border-accent px-3 py-2 text-sm font-semibold text-accent-dark transition-colors hover:bg-accent-soft disabled:cursor-wait disabled:opacity-60">{savingProfile ? "Saving..." : "Save assistant settings"}</button>
        </section>
      )}

      <div className="mt-6">
        {showAiAdd ? (
          <AiQuickAdd onSaved={handleAiSaved} onCancel={() => setShowAiAdd(false)} autoFocus />
        ) : (
          <button
            onClick={() => setShowAiAdd(true)}
            className="group flex w-full items-center gap-4 rounded-2xl border border-accent/25 bg-accent-soft/35 px-4 py-4 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent-soft/60 hover:shadow-md"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
              <FileUp className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-sm font-bold text-ink">Add information with AI</p>
              <p className="text-sm text-ink-muted">
                Paste your price list — AI will do the typing. Khmer, English, or mixed.
              </p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-accent-dark transition-transform duration-150 group-hover:translate-x-1" strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="mt-6 space-y-6">
        <section>
          <div className="mb-2 flex items-center justify-between gap-3"><h2 className="text-base font-bold text-ink">Required information</h2><span className="text-xs font-medium text-ink-muted">Location and hours</span></div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {locationItem ? (
              <AddedRow item={locationItem} />
            ) : openForm?.category === "location" ? (
              <KnowledgeItemForm
                initial={{ ...EMPTY_KNOWLEDGE_FORM, category: "location", title: "Location" }}
                submitLabel="Add"
                onSubmit={handleCreate}
                onCancel={() => setOpenForm(null)}
              />
            ) : (
              <SuggestionRow
                title="Location"
                category="location"
                onAdd={(category, title) => setOpenForm({ category, title })}
                onSkip={() => {}}
              />
            )}

            {hoursItem ? (
              <AddedRow item={hoursItem} />
            ) : openForm?.category === "hours" ? (
              <KnowledgeItemForm
                initial={{ ...EMPTY_KNOWLEDGE_FORM, category: "hours", title: "Opening Hours" }}
                submitLabel="Add"
                onSubmit={handleCreate}
                onCancel={() => setOpenForm(null)}
              />
            ) : (
              <SuggestionRow
                title="Opening Hours"
                category="hours"
                onAdd={(category, title) => setOpenForm({ category, title })}
                onSkip={() => {}}
              />
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-ink">Services</h2>
          <p className="mb-3 text-xs text-ink-muted">Add the products or services customers ask about most often.</p>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {templates.starter_items
              .filter((item) => !skipped.has(item.title) && !isAdded(item.title))
              .map((item) =>
                openForm?.category === item.category && openForm?.title === item.title ? (
                  <KnowledgeItemForm
                    key={item.title}
                    initial={{ ...EMPTY_KNOWLEDGE_FORM, category: item.category, title: item.title, price: item.price }}
                    submitLabel="Add"
                    onSubmit={handleCreate}
                    onCancel={() => setOpenForm(null)}
                  />
                ) : (
                  <SuggestionRow
                    key={item.title}
                    title={item.title}
                    category={item.category}
                    onAdd={(category, title) => setOpenForm({ category, title })}
                    onSkip={(title) => setSkipped((s) => new Set(s).add(title))}
                  />
                )
              )}
            {items
              .filter((i) => i.category === "service")
              .map((item) => (
                <AddedRow key={item.id} item={item} />
              ))}
          </div>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-ink">Frequently asked questions</h2>
          <p className="mb-3 text-xs text-ink-muted">Prepare consistent answers to common customer questions.</p>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {templates.faqs
              .filter((faq) => !skipped.has(faq.title) && !isAdded(faq.title))
              .map((faq) =>
                openForm?.category === "faq" && openForm?.title === faq.title ? (
                  <KnowledgeItemForm
                    key={faq.title}
                    initial={{ ...EMPTY_KNOWLEDGE_FORM, category: "faq", title: faq.title, content_en: faq.content_en, content_km: faq.content_km }}
                    submitLabel="Add"
                    onSubmit={handleCreate}
                    onCancel={() => setOpenForm(null)}
                  />
                ) : (
                  <SuggestionRow
                    key={faq.title}
                    title={faq.title}
                    category="faq"
                    onAdd={(category, title) => setOpenForm({ category, title })}
                    onSkip={(title) => setSkipped((s) => new Set(s).add(title))}
                  />
                )
              )}
            {items
              .filter((i) => i.category === "faq")
              .map((item) => (
                <AddedRow key={item.id} item={item} />
              ))}
          </div>
        </section>

        {items.filter((i) => i.category === "policy" || i.category === "other").length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">Other information</h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {items
                .filter((i) => i.category === "policy" || i.category === "other")
                .map((item) => (
                  <AddedRow key={item.id} item={item} />
                ))}
            </div>
          </section>
        )}

        {openForm === "custom" ? (
          <KnowledgeItemForm
            initial={EMPTY_KNOWLEDGE_FORM}
            submitLabel="Add"
            onSubmit={handleCreate}
            onCancel={() => setOpenForm(null)}
          />
        ) : (
          <button
            onClick={() => setOpenForm("custom")}
            className="flex items-center gap-1.5 text-sm font-semibold text-accent-dark hover:underline"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add custom item
          </button>
        )}
      </div>

      {advanceError && (
        <p className="mt-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{advanceError}</p>
      )}

      <div className="mt-6">
        <Button onClick={handleContinue} disabled={advancing} className="w-full sm:w-auto">
          {advancing ? "Checking..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
