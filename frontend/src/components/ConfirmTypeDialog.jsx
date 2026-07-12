import { useState } from "react";
import Button from "./Button";
import Modal from "./Modal";

export default function ConfirmTypeDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmPhrase,
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const matches = value === confirmPhrase;

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      setValue("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setValue("");
    onClose();
  }

  // ===> return the model
  return (
    <Modal open={open} onClose={handleClose}>
      <h3 className="font-heading text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-muted">{description}</p>
      <p className="mt-3 text-sm text-ink-muted">
        Type <span className="font-mono font-semibold text-ink">{confirmPhrase}</span> to confirm:
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink focus:border-error focus:outline-none focus:ring-1 focus:ring-error"
        autoFocus
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="destructive" disabled={!matches || submitting} onClick={handleConfirm}>
          {submitting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </Modal>
  );
}
