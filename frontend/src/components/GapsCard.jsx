import { Check, MessageCircleQuestion } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../api/client";
import EmptyState from "./EmptyState";
import GapFixModal from "./GapFixModal";
import Skeleton from "./Skeleton";

const FIXED_DISPLAY_MS = 1500;

export default function GapsCard({ showToast }) {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeGap, setActiveGap] = useState(null);
  const [justFixed, setJustFixed] = useState({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/gaps");
      setGaps(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load gaps.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 0));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const task = schedule(() => load());
    return () => cancel(task);
  }, []);

  function handleFixed(clusterId, label) {
    setActiveGap(null);
    setJustFixed((f) => ({ ...f, [clusterId]: label }));
    showToast?.(label === "Fixed" ? "Knowledge added — gap fixed!" : "Gap dismissed.");
    setTimeout(() => {
      setGaps((g) => g.filter((c) => c.id !== clusterId));
      setJustFixed((f) => {
        const { [clusterId]: _removed, ...rest } = f;
        return rest;
      });
    }, FIXED_DISPLAY_MS);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-heading font-bold text-ink">
        Customers asked about things you have no answer for
      </h2>

      {error && (
        <p className="mt-3 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
      )}

      {loading ? (
        <div className="mt-3 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : gaps.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon={MessageCircleQuestion}
            title="No gaps — your assistant answered everything it was asked. 🎉"
          />
        </div>
      ) : (
        <div className="mt-3 divide-y divide-gray-100">
          {gaps.map((cluster) => {
            const fixedLabel = justFixed[cluster.id];
            return (
              <button
                key={cluster.id}
                type="button"
                onClick={() => !fixedLabel && setActiveGap(cluster)}
                disabled={!!fixedLabel}
                className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors duration-150 first:pt-0 last:pb-0 hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{cluster.label_en}</p>
                  <p className="truncate text-xs text-ink-muted">{cluster.label_km}</p>
                </div>
                {fixedLabel ? (
                  <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-accent-dark">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                    {fixedLabel} ✓
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning">
                    asked {cluster.question_count}×
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <GapFixModal
        cluster={activeGap}
        onClose={() => setActiveGap(null)}
        onResolved={(clusterId) => handleFixed(clusterId, "Fixed")}
        onDismissed={(clusterId) => handleFixed(clusterId, "Dismissed")}
      />
    </div>
  );
}
