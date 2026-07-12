import { Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";
import KnowledgeItemForm, { EMPTY_KNOWLEDGE_FORM } from "../../components/KnowledgeItemForm";
import { RowListSkeleton } from "../../components/Skeleton";

function SuggestionRow({ title, category, onAdd, onSkip }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <span className="text-sm font-medium text-ink">{title}</span>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => onAdd(category, title)}
          className="text-sm font-semibold text-accent-dark hover:underline"
        >
          Add
        </button>
        <button
          onClick={() => onSkip(title)}
          className="text-sm font-medium text-ink-muted hover:text-ink"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function AddedRow({ item }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
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
  const [templates, setTemplates] = useState({ services: [], faqs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [advanceError, setAdvanceError] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [skipped, setSkipped] = useState(new Set());
  const [openForm, setOpenForm] = useState(null); // { category, title } | "custom" | null

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [itemsData, templatesData] = await Promise.all([
        apiFetch("/knowledge"),
        apiFetch("/onboarding/templates"),
      ]);
      setItems(itemsData);
      setTemplates(templatesData);
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
    await loadAll();
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

  if (loading) return <RowListSkeleton rows={4} />;
  if (error) return <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>;

  const locationItem = items.find((i) => i.category === "location");
  const hoursItem = items.find((i) => i.category === "hours");
  const isAdded = (title) => items.some((i) => i.title.toLowerCase() === title.toLowerCase());

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-ink">Add your business knowledge</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Your assistant only answers from what you add here. Location and hours are required;
        add at least one service or FAQ too.
      </p>

      <div className="mt-6 space-y-6">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink-muted">Required</h2>
          <div className="space-y-2">
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
          <h2 className="mb-2 text-sm font-semibold text-ink-muted">Suggested services</h2>
          <div className="space-y-2">
            {templates.services
              .filter((title) => !skipped.has(title) && !isAdded(title))
              .map((title) =>
                openForm?.category === "service" && openForm?.title === title ? (
                  <KnowledgeItemForm
                    key={title}
                    initial={{ ...EMPTY_KNOWLEDGE_FORM, category: "service", title }}
                    submitLabel="Add"
                    onSubmit={handleCreate}
                    onCancel={() => setOpenForm(null)}
                  />
                ) : (
                  <SuggestionRow
                    key={title}
                    title={title}
                    category="service"
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
          <h2 className="mb-2 text-sm font-semibold text-ink-muted">Suggested FAQs</h2>
          <div className="space-y-2">
            {templates.faqs
              .filter((title) => !skipped.has(title) && !isAdded(title))
              .map((title) =>
                openForm?.category === "faq" && openForm?.title === title ? (
                  <KnowledgeItemForm
                    key={title}
                    initial={{ ...EMPTY_KNOWLEDGE_FORM, category: "faq", title }}
                    submitLabel="Add"
                    onSubmit={handleCreate}
                    onCancel={() => setOpenForm(null)}
                  />
                ) : (
                  <SuggestionRow
                    key={title}
                    title={title}
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
            <h2 className="mb-2 text-sm font-semibold text-ink-muted">Other</h2>
            <div className="space-y-2">
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
