import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageHeader from "../../components/PageHeader";
import { RowListSkeleton } from "../../components/Skeleton";
import { formatDate, formatRelativeTime } from "../../utils/format";

const STATUS_STYLES = {
  active: "bg-accent-soft text-accent-soft-text",
  paused: "bg-warning-soft text-warning",
  cancelled: "bg-error-soft text-error",
};

export default function Admin() {
  const [businesses, setBusinesses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch("/admin/businesses");
        if (!cancelled) setBusinesses(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true);
        } else {
          setError(err instanceof ApiError ? err.message : "Could not load businesses.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader title="Admin" description="Internal view across every business on the platform." />

      {loading ? (
        <RowListSkeleton rows={4} />
      ) : forbidden ? (
        <EmptyState
          icon={ShieldAlert}
          title="Not authorized"
          description="This page is restricted to platform admins."
        />
      ) : (
        <>
          {error && (
            <p className="mb-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
          )}
          {businesses && businesses.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-ink-muted">Business</th>
                    <th className="px-4 py-3 font-semibold text-ink-muted">Status</th>
                    <th className="px-4 py-3 font-semibold text-ink-muted">Plan</th>
                    <th className="px-4 py-3 font-semibold text-ink-muted">Open gaps</th>
                    <th className="px-4 py-3 font-semibold text-ink-muted">Last summary sent</th>
                    <th className="px-4 py-3 font-semibold text-ink-muted">Signed up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {businesses.map((b) => (
                    <tr key={b.id} className="transition-colors duration-150 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-ink">{b.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[b.status] || "bg-gray-100 text-gray-600"}`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-muted capitalize">{b.plan}</td>
                      <td className="px-4 py-3 text-ink">
                        {b.open_cluster_count > 0 ? (
                          <span className="font-semibold text-warning">{b.open_cluster_count}</span>
                        ) : (
                          <span className="text-ink-muted">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {b.last_summary_sent ? formatRelativeTime(b.last_summary_sent) : "Never"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                        {formatDate(b.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
