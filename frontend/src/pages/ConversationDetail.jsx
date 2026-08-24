import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { useCachedApi } from "../api/useCachedApi";
import { formatDate } from "../utils/format";

export default function ConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    data: conversation,
    loading,
    error: loadError,
  } = useCachedApi(id ? `/conversations/${id}` : null, null);
  const error = loadError instanceof ApiError ? loadError.message : loadError;

  return (
    <div>
      <button
        onClick={() => navigate("/app/conversations")}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to conversations
      </button>

      {error && (
        <p className="mb-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-16 w-2/3 animate-pulse rounded-2xl bg-gray-200 ${i % 2 ? "ml-auto" : ""}`}
            />
          ))}
        </div>
      ) : conversation ? (
        <div>
          <div className="mb-6 flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-ink">
              {conversation.customer_name || `Customer #${conversation.customer_chat_id}`}
            </h1>
            {conversation.handed_off && (
              <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning">
                Needs human
              </span>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
            {conversation.messages.length === 0 ? (
              <p className="text-sm text-ink-muted">No messages in this conversation.</p>
            ) : (
              conversation.messages.map((message) => {
                const isCustomer = message.direction === "customer";
                return (
                  <div
                    key={message.id}
                    className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[65%] ${
                        isCustomer
                          ? "bg-gray-100 text-ink"
                          : "bg-accent-soft text-accent-soft-text"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      <p
                        className={`mt-1 text-[11px] ${
                          isCustomer ? "text-ink-muted" : "text-accent-soft-text/70"
                        }`}
                      >
                        {formatDate(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
