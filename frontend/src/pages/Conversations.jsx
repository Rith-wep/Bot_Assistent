import {
  CheckCircle2,
  ChevronRight,
  Circle,
  MessageSquare,
  Phone,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, apiFetch } from "../api/client";
import { useCachedApi } from "../api/useCachedApi";
import EmptyState from "../components/EmptyState";
import { formatDate, formatRelativeTime } from "../utils/format";

const PAGE_SIZE = 50;
const MESSAGE_LIMIT = 120;

const filters = [
  { key: "all", label: "All" },
  { key: "human", label: "Needs Human" },
  { key: "resolved", label: "Resolved" },
];

function customerLabel(conversation) {
  if (!conversation) return "Customer";
  return conversation.customer_name || `Customer #${conversation.customer_chat_id}`;
}

function initials(name) {
  return (name || "C").trim().charAt(0).toUpperCase();
}

function money(value) {
  if (value === null || value === undefined || value === "") return "$0.00";
  return `$${Number(value).toFixed(2)}`;
}

function statusBadge(conversation) {
  if (conversation?.handed_off) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-accent-soft/60 text-accent-dark ring-accent/30";
}

const ConversationCard = memo(function ConversationCard({ conversation, active, onClick }) {
  const preview = conversation.latest_message || `${conversation.message_count} messages`;
  return (
    <button
      type="button"
      onClick={() => onClick(conversation.id)}
      className={`group flex w-full gap-3 rounded-xl border p-3 text-left transition-all duration-150 ${
        active
          ? "border-accent/40 bg-accent-soft/40 shadow-sm"
          : "border-transparent bg-white hover:border-gray-100 hover:bg-gray-50"
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
        {initials(conversation.customer_name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-heading text-sm font-bold text-slate-950">
            {customerLabel(conversation)}
          </p>
          <span className="shrink-0 text-xs text-slate-500">
            {formatRelativeTime(conversation.last_message_at)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusBadge(
              conversation
            )}`}
          >
            {conversation.handed_off ? "Needs human" : "AI handling"}
          </span>
          <span className="text-[11px] text-slate-400">
            {conversation.latest_message_direction === "customer" ? "Customer" : "Assistant"}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{preview}</p>
      </div>
      <ChevronRight
        className={`mt-3 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 ${
          active ? "text-accent-dark" : ""
        }`}
      />
    </button>
  );
});

const MessageBubble = memo(function MessageBubble({ message }) {
  const isCustomer = message.direction === "customer";
  return (
    <div className={`flex gap-3 ${isCustomer ? "justify-start" : "justify-end"}`}>
      <div className="max-w-[82%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
            isCustomer
              ? "rounded-tl-md bg-slate-100 text-slate-800"
              : "rounded-tr-md border border-accent/40 bg-accent-soft/70 text-accent-dark"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
        <div
          className={`mt-1 flex items-center gap-2 text-[11px] text-slate-500 ${
            isCustomer ? "justify-start" : "justify-end"
          }`}
        >
          <span>{isCustomer ? "Customer" : "Assistant / Admin"}</span>
          <span>{formatDate(message.created_at)}</span>
        </div>
      </div>
    </div>
  );
});

const ContextSidebar = memo(function ContextSidebar({ conversation, onToggleHandoff, toggling }) {
  const cart = conversation?.cart_state || {};
  const order = conversation?.linked_order;
  const items = Array.isArray(cart.items) ? cart.items : [];

  return (
    <aside className="min-h-0 border-t border-gray-200 bg-white p-4 lg:border-l lg:border-t-0">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 font-heading text-lg font-bold text-white">
          {initials(conversation?.customer_name)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-heading font-bold text-slate-950">
            {customerLabel(conversation)}
          </p>
          <p className="text-sm text-slate-500">Telegram customer</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-xl border border-gray-100 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              <span>{conversation?.customer_chat_id}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>{order?.phone || "No phone captured"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Handoff
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {conversation?.handed_off ? "Human Taken Over" : "AI Handling"}
              </p>
            </div>
            <button
              type="button"
              disabled={toggling}
              onClick={() => onToggleHandoff(!conversation?.handed_off)}
              className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
                conversation?.handed_off ? "bg-accent-soft ring-1 ring-accent/50" : "bg-slate-300"
              } disabled:opacity-60`}
              aria-label="Toggle human handoff"
            >
              <span
                className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  conversation?.handed_off ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-accent-dark" />
            <p className="font-heading text-sm font-bold text-slate-950">Cart State</p>
          </div>
          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={`${item.product_id}-${item.variant_id || index}`} className="text-sm">
                  <p className="font-medium text-slate-800">
                    Product #{item.product_id}
                    {item.variant_id ? ` / Variant #${item.variant_id}` : ""}
                  </p>
                  <p className="text-slate-500">Qty {item.qty || 1}</p>
                </div>
              ))}
              {cart.delivery_address_text && (
                <p className="border-t border-gray-100 pt-2 text-sm text-slate-600">
                  {cart.delivery_address_text}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No active cart choices captured.</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent-dark" />
            <p className="font-heading text-sm font-bold text-slate-950">Linked Order</p>
          </div>
          {order ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Status</span>
                <span className="rounded-full border border-accent/30 bg-accent-soft/60 px-2 py-0.5 text-xs font-semibold text-accent-dark">
                  {order.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Total</span>
                <span className="font-bold text-slate-950">{money(order.grand_total)}</span>
              </div>
              <p className="text-slate-600">{order.delivery_zone_name || "No delivery zone"}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No order created from this thread yet.</p>
          )}
        </div>
      </div>
    </aside>
  );
});

export default function Conversations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page] = useState(1);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [detailOverride, setDetailOverride] = useState(null);
  const [listOverrides, setListOverrides] = useState({});
  const [actionError, setActionError] = useState("");
  const scrollRef = useRef(null);

  const listPath = `/conversations?page=${page}&page_size=${PAGE_SIZE}`;
  const { data, loading, error: loadError } = useCachedApi(listPath, {
    items: [],
    total: 0,
  });
  const conversations = useMemo(
    () =>
      (data.items || []).map((item) => ({
        ...item,
        ...(listOverrides[item.id] || {}),
      })),
    [data.items, listOverrides]
  );
  const selectedId = id ? Number(id) : conversations[0]?.id;
  const selectedSummary = conversations.find((conversation) => conversation.id === selectedId);

  const {
    data: loadedDetail,
    loading: detailLoading,
    error: detailError,
  } = useCachedApi(
    selectedId ? `/conversations/${selectedId}?message_limit=${MESSAGE_LIMIT}` : null,
    null
  );
  const conversation = detailOverride?.id === selectedId ? detailOverride : loadedDetail;

  const filteredConversations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return conversations.filter((conversationItem) => {
      if (filter === "human" && !conversationItem.handed_off) return false;
      if (filter === "resolved" && conversationItem.handed_off) return false;
      if (!needle) return true;
      return [
        conversationItem.customer_name,
        String(conversationItem.customer_chat_id),
        conversationItem.latest_message,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [conversations, filter, query]);

  useEffect(() => {
    setDetailOverride(null);
    setActionError("");
  }, [selectedId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end" });
  }, [conversation?.messages?.length, selectedId]);

  const openConversation = useCallback((conversationId) => {
    navigate(`/app/conversations/${conversationId}`);
  }, [navigate]);

  const handleToggleHandoff = useCallback(async (nextValue) => {
    if (!selectedId) return;
    setToggling(true);
    setActionError("");
    try {
      const updated = await apiFetch(`/conversations/${selectedId}/handoff`, {
        method: "PATCH",
        body: { handed_off: nextValue },
      });
      setDetailOverride(updated);
      setListOverrides((current) => ({
        ...current,
        [selectedId]: { handed_off: updated.handed_off },
      }));
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Unable to update handoff");
    } finally {
      setToggling(false);
    }
  }, [selectedId]);

  async function handleSend(event) {
    event.preventDefault();
    const text = reply.trim();
    if (!selectedId || !text) return;
    setSending(true);
    setActionError("");
    try {
      const message = await apiFetch(`/conversations/${selectedId}/reply`, {
        method: "POST",
        body: { text },
      });
      const base = conversation || {
        ...selectedSummary,
        messages: [],
        platform: "Telegram",
      };
      setDetailOverride({
        ...base,
        handed_off: true,
        messages: [...(base.messages || []), message],
      });
      setListOverrides((current) => ({
        ...current,
        [selectedId]: {
          handed_off: true,
          latest_message: message.text,
          latest_message_direction: message.direction,
          last_message_at: message.created_at,
        },
      }));
      setReply("");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Unable to send reply");
    } finally {
      setSending(false);
    }
  }

  const error =
    loadError instanceof ApiError
      ? loadError.message
      : detailError instanceof ApiError
        ? detailError.message
        : loadError || detailError;

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[680px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_280px]">
        <aside className="min-h-0 border-b border-gray-200 bg-slate-50/80 lg:border-b-0 lg:border-r">
          <div className="border-b border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="font-heading text-xl font-bold text-slate-950">Live Inbox</h1>
                <p className="text-sm text-slate-500">Customer conversations</p>
              </div>
              <span className="rounded-full border border-accent/30 bg-accent-soft/60 px-2.5 py-1 text-xs font-semibold text-accent-dark">
                {conversations.length}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search conversations"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              {filters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                    filter === item.key
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-full min-h-0 space-y-2 overflow-y-auto p-3">
            {loading ? (
              [0, 1, 2, 3, 4].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-xl bg-white" />
              ))
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conversationItem) => (
                <ConversationCard
                  key={conversationItem.id}
                  conversation={conversationItem}
                  active={conversationItem.id === selectedId}
                  onClick={openConversation}
                />
              ))
            ) : (
              <div className="rounded-xl bg-white p-4 text-center text-sm text-slate-500">
                No conversations match this view.
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-h-0 flex-col bg-white">
          {error && (
            <p className="m-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
          )}

          {!selectedId && !loading ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="Once customers message your assistant, live chats will show up here."
              />
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-heading text-lg font-bold text-slate-950">
                      {customerLabel(conversation || selectedSummary)}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusBadge(
                        conversation || selectedSummary
                      )}`}
                    >
                      {(conversation || selectedSummary)?.handed_off
                        ? "Human Taken Over"
                        : "AI Handling"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Telegram ID {(conversation || selectedSummary)?.customer_chat_id}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!selectedId || toggling}
                  onClick={() => handleToggleHandoff(!(conversation || selectedSummary)?.handed_off)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    (conversation || selectedSummary)?.handed_off
                      ? "border border-accent/40 bg-accent-soft/70 text-accent-dark hover:border-accent-dark"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Circle className="h-3.5 w-3.5 fill-current" />
                  {(conversation || selectedSummary)?.handed_off ? "Human mode" : "AI mode"}
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6">
                {detailLoading && !conversation ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((item) => (
                      <div
                        key={item}
                        className={`h-16 w-2/3 animate-pulse rounded-2xl bg-white ${
                          item % 2 ? "ml-auto" : ""
                        }`}
                      />
                    ))}
                  </div>
                ) : conversation?.messages?.length ? (
                  <div className="space-y-4">
                    {conversation.messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={scrollRef} />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No messages in this conversation.
                  </div>
                )}
              </div>

              <form onSubmit={handleSend} className="border-t border-gray-200 bg-white p-4">
                {actionError && (
                  <p className="mb-3 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">
                    {actionError}
                  </p>
                )}
                <div className="flex items-end gap-3 rounded-2xl border border-gray-200 bg-slate-50 p-2">
                  <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft/60 text-accent-dark sm:flex">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    rows={1}
                    placeholder="Reply directly to Telegram..."
                    className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/40 bg-accent-soft/70 text-accent-dark transition-colors hover:border-accent-dark disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-300"
                    aria-label="Send reply"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </main>

        {selectedId && (
          <ContextSidebar
            conversation={conversation || selectedSummary}
            onToggleHandoff={handleToggleHandoff}
            toggling={toggling}
          />
        )}
      </div>
    </div>
  );
}
