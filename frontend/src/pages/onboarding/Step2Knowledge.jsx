import { ArrowLeft, ArrowRight, Bot, Check, FileUp, Plus } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";
import KnowledgeItemForm, { EMPTY_KNOWLEDGE_FORM } from "../../components/KnowledgeItemForm";
import { RowListSkeleton } from "../../components/Skeleton";
import useSessionStorageState from "../../hooks/useSessionStorageState";

const AiQuickAdd = lazy(() => import("../../components/AiQuickAdd"));

const TABS = [
  { key: "required", label: "Required Info" },
  { key: "services", label: "Products & Services" },
  { key: "faqs", label: "FAQs" },
];

const PERSONALITIES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "luxury", label: "Luxury" },
  { value: "sales", label: "Sales" },
];

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-accent focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent";

function SuggestionRow({ title, category, onAdd, onSkip }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 last:border-b-0">
      <span className="min-w-0 text-sm font-medium text-ink sm:truncate">{title}</span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onAdd(category, title)}
          className="rounded-md border border-accent/25 bg-accent-soft/50 px-3 py-1 text-xs font-medium text-accent-dark transition-colors hover:bg-accent-soft"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => onSkip(title)}
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function AddedRow({ item }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 items-start gap-2 sm:items-center">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft">
          <Check className="h-3 w-3 text-accent-dark" strokeWidth={3} />
        </div>
        <div className="min-w-0">
          <span className="block text-sm font-medium text-ink sm:truncate">{item.title}</span>
          {item.price && (
            <span className="mt-1 block text-sm font-semibold text-accent-dark sm:mt-0">
              {item.price}
            </span>
          )}
        </div>
      </div>
      <span className="w-fit rounded-full border border-accent/30 bg-accent-soft/50 px-2.5 py-1 text-xs font-semibold text-accent-dark">
        Completed
      </span>
    </div>
  );
}

function EmptyTabState({ label }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
      <p className="text-sm font-medium text-ink">No open suggestions</p>
      <p className="mt-1 text-sm text-ink-muted">{label} looks clear for now.</p>
    </div>
  );
}

export default function Step2Knowledge({
  cachedData,
  onDataChange,
  onChecklistStale,
  onAdvance,
  onBack,
}) {
  const [items, setItems] = useState(cachedData?.items || []);
  const [templates, setTemplates] = useState(
    cachedData?.templates || { starter_items: [], faqs: [] }
  );
  const [aiProfile, setAiProfile] = useSessionStorageState("onboarding:step2:aiProfile", null);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState("");
  const [advanceError, setAdvanceError] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [skipped, setSkipped] = useState(new Set());
  const [openForm, setOpenForm] = useState(null); // { category, title } | "custom" | null
  const [showAiAdd, setShowAiAdd] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("required");

  async function loadAll(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      if (cachedData) {
        setItems(cachedData.items);
        setTemplates(cachedData.templates);
        setAiProfile((draft) => draft || cachedData.aiProfile);
        return;
      }

      const [itemsData, templatesData, settingsData] = await Promise.all([
        apiFetch("/knowledge"),
        apiFetch("/onboarding/templates"),
        apiFetch("/settings"),
      ]);
      setItems(itemsData);
      setTemplates(templatesData);
      setAiProfile((draft) => draft || settingsData.ai_profile);
      onDataChange?.({
        items: itemsData,
        templates: templatesData,
        aiProfile: settingsData.ai_profile,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load knowledge setup.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function reloadKnowledgeOnly() {
    const nextItems = await apiFetch("/knowledge");
    setItems(nextItems);
    onDataChange?.({ items: nextItems, templates, aiProfile });
    onChecklistStale?.();
  }

  async function handleCreate(values) {
    await apiFetch("/knowledge", { method: "POST", body: values });
    setOpenForm(null);
    await reloadKnowledgeOnly();
  }

  async function handleAiSaved() {
    setShowAiAdd(false);
    await reloadKnowledgeOnly();
  }

  async function handleContinue() {
    setAdvanceError("");
    setAdvancing(true);
    try {
      const nextStatus = await apiFetch("/onboarding/step2/complete", { method: "POST" });
      onChecklistStale?.();
      onAdvance(nextStatus);
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
      onDataChange?.({ items, templates, aiProfile: saved });
    } finally {
      setSavingProfile(false);
    }
  }

  const itemsByCategory = useMemo(() => {
    const grouped = {
      location: [],
      hours: [],
      service: [],
      faq: [],
      policy: [],
      other: [],
    };
    for (const item of items) {
      if (grouped[item.category]) grouped[item.category].push(item);
    }
    return grouped;
  }, [items]);
  const addedTitles = useMemo(
    () => new Set(items.map((item) => item.title.toLowerCase())),
    [items]
  );
  const locationItem = itemsByCategory.location[0];
  const hoursItem = itemsByCategory.hours[0];
  const isAdded = (title) => addedTitles.has(title.toLowerCase());
  const serviceItems = itemsByCategory.service;
  const faqItems = itemsByCategory.faq;
  const otherItems = [...itemsByCategory.policy, ...itemsByCategory.other];
  const completedRequired = [locationItem, hoursItem].filter(Boolean).length;

  const availableServices = useMemo(
    () => templates.starter_items.filter((item) => !skipped.has(item.title) && !isAdded(item.title)),
    [templates.starter_items, skipped, addedTitles]
  );
  const availableFaqs = useMemo(
    () => templates.faqs.filter((faq) => !skipped.has(faq.title) && !isAdded(faq.title)),
    [templates.faqs, skipped, addedTitles]
  );

  if (loading) return <RowListSkeleton rows={4} />;
  if (error) return <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>;

  return (
    <div className="w-full pb-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-dark">
        Business setup
      </p>
      <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Add your business knowledge
      </h1>
      {/* <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
        Your assistant only answers from what you add here. Start with location, hours, and the
        things customers ask about most.
      </p> */}

      {aiProfile && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft/45 text-accent-dark">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-heading text-base font-bold text-ink">Meet your assistant</h2>
                  {/* <p className="text-sm text-ink-muted">Set the starting voice for customer replies.</p> */}
                </div>
              </div>
            </div>

            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
              <input
                className={inputClass}
                value={aiProfile.assistant_name}
                onChange={(e) => setAiProfile({ ...aiProfile, assistant_name: e.target.value })}
                placeholder="Assistant name"
              />
              <select
                className={`${inputClass} hidden sm:block`}
                value={aiProfile.personality}
                onChange={(e) => setAiProfile({ ...aiProfile, personality: e.target.value })}
              >
                {PERSONALITIES.map((personality) => (
                  <option key={personality.value} value={personality.value}>
                    {personality.label}
                  </option>
                ))}
              </select>
              <div className="grid gap-2 sm:hidden">
                {PERSONALITIES.map((personality) => {
                  const selected = aiProfile.personality === personality.value;
                  return (
                    <button
                      key={personality.value}
                      type="button"
                      onClick={() =>
                        setAiProfile({ ...aiProfile, personality: personality.value })
                      }
                      className={`flex min-h-10 w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                        selected
                          ? "border-accent bg-accent-soft/35 text-ink"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <span>{personality.label}</span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          selected ? "border-accent bg-accent text-white" : "border-slate-300"
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="secondary"
              type="button"
              onClick={saveProfile}
              isLoading={savingProfile}
              loadingLabel="Saving..."
              className="shrink-0 border-slate-200 text-slate-700 hover:border-accent/40 hover:text-accent-dark"
            >
              Save settings
            </Button>
          </div>

          {templates.default_rules?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {templates.default_rules.map((rule) => (
                <span
                  key={rule}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  <Check className="h-3 w-3 text-accent-dark" />
                  {rule}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="mt-6">
        {showAiAdd ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <Suspense fallback={<RowListSkeleton rows={2} />}>
              <AiQuickAdd onSaved={handleAiSaved} onCancel={() => setShowAiAdd(false)} autoFocus />
            </Suspense>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAiAdd(true)}
            className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition-colors duration-150 hover:border-accent/40 hover:bg-accent-soft/25"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent-soft/45 text-accent-dark">
              <FileUp className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-base font-bold text-ink">Add information with AI</p>
              {/* <p className="mt-1 text-sm text-ink-muted">
                Supports Khmer & English price lists, menus, service lists, policies, and FAQs.
              </p> */}
            </div>
            <span className="ml-auto hidden shrink-0 rounded-lg bg-accent-dark px-4 py-2 text-sm font-semibold text-white sm:inline-flex">
              Paste & Extract with AI
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-accent-dark transition-transform group-hover:translate-x-1 sm:hidden" />
          </button>
        )}
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-white px-4 pt-3">
          <div className="flex gap-6 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`border-b-2 px-1 pb-3 pt-1 text-left transition-colors ${
                  activeTab === tab.key
                    ? "border-accent text-ink"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                <span className="block text-sm font-bold">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === "required" && (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-base font-bold text-ink">Required information</h2>
                  
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {completedRequired}/2 complete
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
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
            </div>
          )}

          {activeTab === "services" && (
            <div>
              <div className="mb-4">
                <h2 className="font-heading text-base font-bold text-ink">Products & services</h2>
                
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {availableServices.map((item) =>
                  openForm?.category === item.category && openForm?.title === item.title ? (
                    <KnowledgeItemForm
                      key={item.title}
                      initial={{
                        ...EMPTY_KNOWLEDGE_FORM,
                        category: item.category,
                        title: item.title,
                        price: item.price,
                      }}
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
                {serviceItems.map((item) => (
                  <AddedRow key={item.id} item={item} />
                ))}
              </div>
              {availableServices.length === 0 && serviceItems.length === 0 && (
                <div className="mt-3">
                  <EmptyTabState label="Products and services" />
                </div>
              )}
            </div>
          )}

          {activeTab === "faqs" && (
            <div>
              <div className="mb-4">
                <h2 className="font-heading text-base font-bold text-ink">Frequently asked questions</h2>
                
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {availableFaqs.map((faq) =>
                  openForm?.category === "faq" && openForm?.title === faq.title ? (
                    <KnowledgeItemForm
                      key={faq.title}
                      initial={{
                        ...EMPTY_KNOWLEDGE_FORM,
                        category: "faq",
                        title: faq.title,
                        content_en: faq.content_en,
                        content_km: faq.content_km,
                      }}
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
                {faqItems.map((item) => (
                  <AddedRow key={item.id} item={item} />
                ))}
              </div>
              {availableFaqs.length === 0 && faqItems.length === 0 && (
                <div className="mt-3">
                  <EmptyTabState label="FAQs" />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {otherItems.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-ink">Other information</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {otherItems.map((item) => (
              <AddedRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 mb-8">
        {openForm === "custom" ? (
          <KnowledgeItemForm
            initial={EMPTY_KNOWLEDGE_FORM}
            submitLabel="Add"
            onSubmit={handleCreate}
            onCancel={() => setOpenForm(null)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setOpenForm("custom")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-accent-dark transition-colors hover:bg-accent-soft/40"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add custom item
          </button>
        )}
      </div>

      {advanceError && (
        <p className="mt-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{advanceError}</p>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <Button onClick={handleContinue} isLoading={advancing} loadingLabel="Checking..." className="min-w-36">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
