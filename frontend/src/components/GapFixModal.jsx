import { useState } from "react";
import { apiFetch, ApiError } from "../api/client";
import Button from "./Button";
import KnowledgeItemForm from "./KnowledgeItemForm";
import Modal from "./Modal";

export default function GapFixModal({ cluster, onClose, onResolved, onDismissed }) {
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState("");

  if (!cluster) return null;

  const initial = {
    category: cluster.suggested_category,
    title: cluster.label_en,
    content_en: "",
    content_km: "",
    price: "",
    sort_order: 0,
  };

  async function handleSubmit(values) {
    await apiFetch(`/gaps/${cluster.id}/resolve`, {
      method: "POST",
      body: {
        category: values.category,
        title: values.title,
        content_en: values.content_en,
        content_km: values.content_km,
        price: values.price,
      },
    });
    onResolved(cluster.id);
  }

  async function handleDismiss() {
    setError("");
    setDismissing(true);
    try {
      await apiFetch(`/gaps/${cluster.id}/dismiss`, { method: "POST" });
      onDismissed(cluster.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not dismiss. Please try again.");
      setDismissing(false);
    }
  }

  return (
    <Modal open onClose={onClose} size="lg">
      <h3 className="font-heading text-lg font-bold text-ink">{cluster.label_en}</h3>
      <p className="text-sm text-ink-muted">{cluster.label_km}</p>

      <div className="mt-3 rounded-lg bg-page px-3 py-2.5">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Asked {cluster.question_count} time{cluster.question_count === 1 ? "" : "s"}, e.g.
        </p>
        <ul className="space-y-1 text-sm text-ink">
          {cluster.sample_questions.map((q, i) => (
            <li key={i}>&ldquo;{q}&rdquo;</li>
          ))}
        </ul>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
      )}

      <div className="mt-4">
        <KnowledgeItemForm
          initial={initial}
          submitLabel="Save & resolve"
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </div>

      <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
        <Button variant="ghost" onClick={handleDismiss} disabled={dismissing}>
          {dismissing ? "Dismissing..." : "Dismiss — not relevant to my business"}
        </Button>
      </div>
    </Modal>
  );
}
