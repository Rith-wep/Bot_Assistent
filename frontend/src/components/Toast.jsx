import { useState } from "react";

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  function addToast(message, type = "success") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }

  return { toasts, addToast };
}

export function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${
            t.type === "error" ? "bg-error text-white" : "bg-ink text-white"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
