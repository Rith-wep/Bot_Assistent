const VARIANTS = {
  primary:
    "bg-accent-dark text-white hover:bg-accent-soft-text focus-visible:ring-accent shadow-sm",
  secondary:
    "border border-gray-300 bg-white text-ink hover:bg-gray-50 focus-visible:ring-accent",
  outline:
    "border border-accent/40 text-accent-dark bg-white hover:bg-accent-soft focus-visible:ring-accent",
  destructive:
    "border border-error/30 text-error hover:bg-error-soft focus-visible:ring-error",
  ghost: "text-ink-muted hover:bg-gray-100 focus-visible:ring-accent",
};

export default function Button({
  variant = "primary",
  className = "",
  disabled,
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
