import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "../api/client";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import { RowListSkeleton } from "../components/Skeleton";
import { formatRelativeTime } from "../utils/format";

const PAGE_SIZE = 20;

export default function Conversations() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch(`/conversations?page=${page}&page_size=${PAGE_SIZE}`);
        if (!cancelled) {
          setConversations(data.items);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load conversations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div>
      <PageHeader
        title="Conversations"
        description="Every customer chat your assistant has handled."
      />

      {error && (
        <p className="mb-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
      )}

      {loading ? (
        <RowListSkeleton rows={5} />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Once customers start messaging your assistant, their conversations will show up here."
        />
      ) : (
        <>
          <div className="space-y-3">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/app/conversations/${conv.id}`)}
                className="flex w-full items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-shadow duration-150 hover:shadow-md"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-heading font-bold text-ink">
                      {conv.customer_name || `Customer #${conv.customer_chat_id}`}
                    </h3>
                    {conv.handed_off && (
                      <span className="shrink-0 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning">
                        Needs human
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {conv.message_count} message{conv.message_count === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-ink-muted">
                  {formatRelativeTime(conv.last_message_at)}
                </span>
              </button>
            ))}
          </div>

          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
