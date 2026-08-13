import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import Button from "./Button";
import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  variant = "destructive",
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={submitting ? () => {} : onClose}>
      <div className="flex items-start gap-3">
        {variant === "destructive" && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-soft">
            <AlertTriangle className="h-5 w-5 text-error" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-heading text-lg font-bold text-ink">{title}</h3>
          {description && (
            <p className="mt-1.5 text-sm text-ink-muted">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant={variant} disabled={submitting} onClick={handleConfirm}>
          {submitting ? "Deleting..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
