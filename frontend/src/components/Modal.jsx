const SIZES = {
  sm: "max-w-sm",
  lg: "max-w-2xl",
};

export default function Modal({ open, onClose, size = "sm", children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/55 px-4 backdrop-blur-[2px]">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative max-h-[90vh] w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6 ${SIZES[size]}`}
      >
        {children}
      </div>
    </div>
  );
}
