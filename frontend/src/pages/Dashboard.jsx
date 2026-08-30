import { CreditCard, MessageSquare, Sparkles, UserPlus } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { useCachedApi } from "../api/useCachedApi";
import GapsCard from "../components/GapsCard";
import GettingStartedCard from "../components/GettingStartedCard";
import PageHeader from "../components/PageHeader";
import Skeleton from "../components/Skeleton";
import StartConversationCard from "../components/StartConversationCard";
import StatCard from "../components/StatCard";
import { ToastContainer, useToasts } from "../components/Toast";
import { formatRelativeTime } from "../utils/format";
import { useAuth } from "../context/AuthContext";

const ConversationsChart = lazy(() => import("../components/ConversationsChart"));

function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <Skeleton className="mb-5 h-5 w-56" />
        <Skeleton className="mb-6 h-1.5 w-full" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 border-t border-gray-100 py-4 first:border-t-0">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1"><Skeleton className="mb-2 h-4 w-40" /><Skeleton className="h-3 w-64" /></div>
          </div>
        ))}
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <Skeleton className="mb-3 h-4 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => <div key={i} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"><Skeleton className="mb-5 h-5 w-48" /><Skeleton className="h-32 w-full" /></div>)}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [range, setRange] = useState("30d");
  const [activityEnabled, setActivityEnabled] = useState(false);
  const { data: summary, loading: summaryLoading, error: summaryError } = useCachedApi("/dashboard/summary", null);
  const activityPath = `/dashboard/activity?range=${range}`;
  const { data: activity, error: activityError } = useCachedApi(
    activityEnabled && summary?.has_activity ? activityPath : null,
    null,
  );
  const stats = summary && { ...summary, ...(activity || { chart: [], recent_leads: [], recent_conversations: [] }) };
  const loading = summaryLoading;
  const error = (summaryError || activityError) instanceof ApiError ? (summaryError || activityError).message : (summaryError || activityError);
  const { toasts, addToast } = useToasts();
  const { businessType } = useAuth();
  const isRetail = businessType === "product_retail";

  useEffect(() => {
    const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 0));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const task = schedule(() => setActivityEnabled(true));
    return () => cancel(task);
  }, []);

  const checklistIncomplete =
    stats &&
    !(
      stats.checklist.knowledge_added &&
      stats.checklist.telegram_connected &&
      stats.checklist.admin_notifications_connected &&
      stats.checklist.payments_enabled
    );

  return (
    <div>
      <PageHeader title="Dashboard" description="How your assistant is doing." />

      {error && (
        <p className="mb-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        stats && (
          <>
            {checklistIncomplete && <GettingStartedCard checklist={stats.checklist} />}

            <div className="mb-6 lg:mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={MessageSquare}
                label="Total conversations"
                value={stats.total_conversations.value}
                changePct={stats.total_conversations.change_pct}
                muted={!stats.has_activity}
              />
              <StatCard
                icon={UserPlus}
                label={isRetail ? "New orders" : "New leads"}
                value={stats.new_leads.value}
                changePct={stats.new_leads.change_pct}
                muted={!stats.has_activity}
              />
              <StatCard
                icon={Sparkles}
                label="Handled by AI"
                value={stats.messages_ai_handled.value}
                changePct={stats.messages_ai_handled.change_pct}
                subtext={`${stats.messages_escalated.value} escalated to human`}
                muted={!stats.has_activity}
              />
              <StatCard
                icon={CreditCard}
                label="Payments received"
                value={`$${stats.payments.total.toFixed(2)}`}
                changePct={stats.payments.change_pct}
                subtext={`${stats.payments.count} payments`}
                muted={!stats.has_activity}
              />
            </div>

            {!stats.has_activity && (
              <p className="-mt-3 mb-6 lg:mb-4 text-center text-xs text-ink-muted">
                Appears when your assistant starts talking to customers.
              </p>
            )}

            {!stats.has_activity ? (
              <StartConversationCard
                botUsername={stats.bot_username}
                telegramConnected={stats.checklist.telegram_connected}
              />
            ) : (
              <>
                {activityEnabled && <div className="mb-6 lg:mb-4"><GapsCard showToast={addToast} /></div>}

                <Suspense
                  fallback={
                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                      <Skeleton className="h-60 w-full" />
                    </div>
                  }
                >
                  {activity ? <ConversationsChart data={stats.chart} range={range} onRangeChange={setRange} /> : <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"><Skeleton className="h-60 w-full" /></div>}
                </Suspense>

                <div className="mt-6 lg:mt-4 grid grid-cols-1 gap-6 lg:gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-150 hover:shadow-md lg:p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="font-heading font-bold text-ink">{isRetail ? "Recent orders" : "Recent leads"}</h2>
                      <Link
                        to="/app/leads"
                        className="text-sm font-medium text-accent-dark hover:underline"
                      >
                        View all
                      </Link>
                    </div>
                    {stats.recent_leads.length === 0 ? (
                      <p className="text-sm text-ink-muted">{isRetail ? "No orders yet." : "No leads yet."}</p>
                    ) : (
                      <div className="space-y-3">
                        {stats.recent_leads.map((lead) => (
                          <div key={lead.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-ink">{lead.name}</p>
                              <p className="text-xs text-ink-muted">
                                {lead.phone} &middot; {lead.source}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-ink-muted">
                              {formatRelativeTime(lead.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-150 hover:shadow-md lg:p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="font-heading font-bold text-ink">Recent conversations</h2>
                      <Link
                        to="/app/conversations"
                        className="text-sm font-medium text-accent-dark hover:underline"
                      >
                        View all
                      </Link>
                    </div>
                    {stats.recent_conversations.length === 0 ? (
                      <p className="text-sm text-ink-muted">No conversations yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {stats.recent_conversations.map((conv) => (
                          <Link
                            key={conv.id}
                            to={`/app/conversations/${conv.id}`}
                            className="flex items-center justify-between gap-3 rounded-lg -mx-2 px-2 py-1 transition-colors duration-150 hover:bg-gray-50"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-sm font-medium text-ink">
                                  {conv.customer_name}
                                </p>
                                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-muted">
                                  {conv.language}
                                </span>
                              </div>
                              <p className="truncate text-xs text-ink-muted">
                                {conv.last_message || "—"}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-ink-muted">
                              {formatRelativeTime(conv.last_message_at)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
