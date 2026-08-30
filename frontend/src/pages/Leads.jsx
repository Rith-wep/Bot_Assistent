import { Download, Users } from "lucide-react";
import { useState } from "react";
import { ApiError, downloadFile } from "../api/client";
import { useCachedApi } from "../api/useCachedApi";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import { RowListSkeleton } from "../components/Skeleton";
import { formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";
import Orders from "./Orders";

const PAGE_SIZE = 20;

function LeadManager() {
  const [page, setPage] = useState(1);
  const path = `/leads?page=${page}&page_size=${PAGE_SIZE}`;
  const {
    data,
    loading,
    error: loadError,
    setError,
  } = useCachedApi(path, { items: [], total: 0 });
  const [exporting, setExporting] = useState(false);
  const error = loadError instanceof ApiError ? loadError.message : loadError;

  const visibleLeads = data.items || [];
  const visibleTotal = data.total ?? 0;

  async function handleExport() {
    setExporting(true);
    try {
      await downloadFile("/leads/export", "leads.csv");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not export leads.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Customers your assistant has identified as ready to buy."
        action={
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4" strokeWidth={2.5} />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        }
      />

      {error && (
        <p className="mb-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
      )}

      {loading ? (
        <RowListSkeleton rows={5} />
      ) : visibleLeads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No leads yet"
          description="Leads your assistant collects will appear here — with the customer's name, phone number, and what they're interested in."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-ink-muted">Name</th>
                  <th className="px-4 py-3 font-semibold text-ink-muted">Phone</th>
                  <th className="px-4 py-3 font-semibold text-ink-muted">Interest</th>
                  <th className="px-4 py-3 font-semibold text-ink-muted">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleLeads.map((lead) => (
                  <tr key={lead.id} className="transition-colors duration-150 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-ink">
                      {lead.customer_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="font-medium text-accent-dark hover:underline"
                        >
                          {lead.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{lead.interest || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                      {formatDate(lead.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {visibleLeads.map((lead) => (
              <div key={lead.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-bold text-ink">
                    {lead.customer_name || "Unknown"}
                  </h3>
                  <span className="shrink-0 text-xs text-ink-muted">
                    {formatDate(lead.created_at)}
                  </span>
                </div>
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="mt-1 inline-block font-medium text-accent-dark hover:underline"
                  >
                    {lead.phone}
                  </a>
                )}
                {lead.interest && (
                  <p className="mt-1 text-sm text-ink-muted">{lead.interest}</p>
                )}
              </div>
            ))}
          </div>

          <Pagination page={page} pageSize={PAGE_SIZE} total={visibleTotal} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function Leads() {
  const { businessType } = useAuth();
  return businessType === "product_retail" ? <Orders /> : <LeadManager />;
}
