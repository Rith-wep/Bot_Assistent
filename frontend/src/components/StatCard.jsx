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
      className={`rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-150 hover:shadow-md ${
        muted ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-accent-dark">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`font-heading text-2xl font-bold ${muted ? "text-gray-400" : "text-gray-900"}`}>
          {muted ? "-" : value}
        </span>
        {hasChange && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              isGood ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
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
      <p className="mt-1 text-xs text-gray-500">{muted ? "\u00a0" : subtext || "vs last 7 days"}</p>
    </div>
  );
}
