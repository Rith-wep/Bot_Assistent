import { TrendingDown, TrendingUp } from "lucide-react";

export default function StatCard({
  icon: Icon,
  label,
  value,
  changePct,
  positiveDirection = "up",
  subtext,
  muted = false,
}) {
  const hasChange = !muted && changePct !== null && changePct !== undefined;
  const isUp = hasChange && changePct > 0;
  const isGood = hasChange && (positiveDirection === "up" ? changePct > 0 : changePct < 0);

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-5 lg:p-4 ${muted ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2 text-ink-muted">
        <Icon className="h-4 w-4" strokeWidth={2} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`font-heading text-2xl font-bold ${muted ? "text-ink-muted" : "text-ink"}`}
        >
          {muted ? "—" : value}
        </span>
        {hasChange && (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold ${
              isGood ? "text-accent-dark" : "text-error"
            }`}
          >
            {isUp ? (
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.5} />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            {Math.abs(changePct).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">
        {muted ? " " : subtext || "vs last 7 days"}
      </p>
    </div>
  );
}
