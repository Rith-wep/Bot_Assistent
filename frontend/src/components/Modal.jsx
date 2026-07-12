const SIZES = {
  sm: "max-w-sm",
  lg: "max-w-2xl",
};

export default function Modal({ open, onClose, size = "sm", children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white p-6 shadow-xl ${SIZES[size]}`}
      >
        {children}
      </div>
    </div>
  );
}
