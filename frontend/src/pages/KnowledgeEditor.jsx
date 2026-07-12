import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../api/client";
import Button from "../components/Button";
import CategoryBadge from "../components/CategoryBadge";
import EmptyState from "../components/EmptyState";
import KnowledgeItemForm, {
  EMPTY_KNOWLEDGE_FORM,
} from "../components/KnowledgeItemForm";
import PageHeader from "../components/PageHeader";
import { KnowledgeListSkeleton } from "../components/Skeleton";

export default function KnowledgeEditor() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  async function loadItems() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/knowledge");
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load knowledge items.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleCreate(values) {
    await apiFetch("/knowledge", { method: "POST", body: values });
    setShowAddForm(false);
    await loadItems();
  }

  async function handleUpdate(id, values) {
    await apiFetch(`/knowledge/${id}`, { method: "PUT", body: values });
    setEditingId(null);
    await loadItems();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this knowledge item?")) return;
    try {
      await apiFetch(`/knowledge/${id}`, { method: "DELETE" });
      await loadItems();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete item.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Knowledge"
        description="What your assistant knows and answers customers with."
        action={
          !showAddForm && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Add item
            </Button>
          )
        }
      />

      {error && (
        <p className="mb-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
      )}

      {showAddForm && (
        <div className="mb-6">
          <KnowledgeItemForm
            initial={EMPTY_KNOWLEDGE_FORM}
            submitLabel="Add"
            onSubmit={handleCreate}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {loading ? (
        <KnowledgeListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No knowledge items yet"
          description="Add your services, hours, location, and FAQs so your assistant can answer customers accurately."
          action={
            !showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Add your first item
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) =>
            editingId === item.id ? (
              <KnowledgeItemForm
                key={item.id}
                initial={{
                  category: item.category,
                  title: item.title,
                  content_en: item.content_en || "",
                  content_km: item.content_km || "",
                  price: item.price || "",
                  sort_order: item.sort_order,
                }}
                submitLabel="Save"
                onSubmit={(values) => handleUpdate(item.id, values)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={item.id}
                className="group rounded-xl border border-gray-200 bg-white p-4 transition-shadow duration-150 hover:shadow-md sm:p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={item.category} />
                      {item.price && (
                        <span className="font-heading text-sm font-bold text-accent-dark">
                          {item.price}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 truncate font-heading font-bold text-ink">{item.title}</h3>
                    {item.content_en && (
                      <p className="mt-1 text-sm text-ink-muted">{item.content_en}</p>
                    )}
                    {item.content_km && (
                      <p className="mt-1 text-sm text-ink-muted">{item.content_km}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      onClick={() => setEditingId(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-accent-soft hover:text-accent-dark"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-error-soft hover:text-error"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
