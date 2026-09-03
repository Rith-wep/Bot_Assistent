import { Download, Eye, PackageCheck, Search, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "../api/client";
import { useCachedApi } from "../api/useCachedApi";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import { RowListSkeleton } from "../components/Skeleton";
import { formatDate } from "../utils/format";

const PAGE_SIZE = 20;
const EXPORT_PAGE_SIZE = 100;
const NEXT_STATUS = { pending: "confirmed", confirmed: "shipped" };
const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  cancelled: "Cancelled",
};
const PAYMENT_LABELS = {
  unpaid: "Unpaid",
  paid: "Paid",
  refunded: "Refunded",
};
const CHANNEL_LABELS = {
  telegram: "Telegram",
  website: "Website",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
};

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function orderItemsText(order) {
  return order.items
    .map((item) => `${item.product_name}${item.variant_label ? ` (${item.variant_label})` : ""} x${item.qty}`)
    .join("; ");
}

function inDateRange(order, fromDate, toDate) {
  const created = new Date(order.created_at);
  if (fromDate && created < new Date(`${fromDate}T00:00:00`)) return false;
  if (toDate && created > new Date(`${toDate}T23:59:59.999`)) return false;
  return true;
}

function sourceLabel(order) {
  return CHANNEL_LABELS[order.channel] || order.channel || "Telegram";
}

function downloadCsv(filename, rows) {
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function OrderDetailsModal({ order, onClose }) {
  return (
    <Modal open={Boolean(order)} onClose={onClose} size="lg">
      {order && (
        <div>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-heading text-xl font-bold text-ink">
                {order.order_number || `Order #${order.id}`}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">{formatDate(order.created_at)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-soft-text">
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase text-ink-muted">Customer</p>
              <p className="mt-2 font-medium text-ink">{order.customer_name || "Unknown"}</p>
              <p className="text-sm text-ink-muted">{order.phone || "No phone"}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase text-ink-muted">Delivery</p>
              <p className="mt-2 font-medium text-ink">{order.delivery_zone_name || "No zone"}</p>
              <p className="text-sm text-ink-muted">{order.delivery_address_text}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase text-ink-muted">Channel</p>
              <p className="mt-2 font-medium capitalize text-ink">{order.channel || "telegram"}</p>
              <p className="text-sm text-ink-muted">{order.external_customer_id || "No external ID"}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase text-ink-muted">Payment</p>
              <p className="mt-2 font-medium uppercase text-ink">{order.payment_method}</p>
              <p className="text-sm text-ink-muted">{PAYMENT_LABELS[order.payment_status] || order.payment_status}</p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-ink-muted">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Variant</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item, index) => (
                  <tr key={`${item.product_id}-${item.variant_id || "base"}-${index}`}>
                    <td className="px-3 py-2 font-medium text-ink">{item.product_name}</td>
                    <td className="px-3 py-2 text-ink-muted">{item.variant_label || "-"}</td>
                    <td className="px-3 py-2 text-right">{item.qty}</td>
                    <td className="px-3 py-2 text-right">${item.unit_price}</td>
                    <td className="px-3 py-2 text-right">${item.line_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between gap-4"><span className="text-ink-muted">Items</span><span className="font-medium">${order.items_total}</span></div>
            <div className="flex justify-between gap-4"><span className="text-ink-muted">Delivery</span><span className="font-medium">${order.delivery_fee}</span></div>
            <div className="flex justify-between gap-4 border-t border-gray-200 pt-2 font-heading text-base font-bold"><span>Grand total</span><span className="text-accent-dark">${order.grand_total}</span></div>
            <div className="flex justify-between gap-4"><span className="text-ink-muted">Payment</span><span className="font-medium uppercase">{order.payment_method}</span></div>
          </div>

          {order.cancelled_at && (
            <div className="mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-semibold">Cancelled {formatDate(order.cancelled_at)}</p>
              {order.cancellation_reason && <p className="mt-1">{order.cancellation_reason}</p>}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Orders() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const queryParams = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (paymentFilter !== "all") params.set("payment_status", paymentFilter);
    if (channelFilter !== "all") params.set("channel", channelFilter);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    return params.toString();
  }, [channelFilter, page, paymentFilter, searchQuery, statusFilter]);
  const path = `/orders?${queryParams}`;
  const { data, setData, loading, error: loadError, setError } = useCachedApi(path, { items: [], total: 0 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const error = loadError instanceof ApiError ? loadError.message : loadError;
  const orders = data.items || [];

  useEffect(() => {
    setPage(1);
  }, [channelFilter, paymentFilter, searchQuery, statusFilter]);

  async function updateStatus(order, status, cancellationReason = null) {
    setUpdatingOrderId(order.id);
    try {
      const updated = await apiFetch(`/orders/${order.id}/status`, {
        method: "PUT",
        body: { status, cancellation_reason: cancellationReason },
      });
      setData((current) => ({ ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) }));
      setSelectedOrder((current) => current?.id === updated.id ? updated : current);
      setCancelOrder(null);
      setCancelReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update order.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      let exportPage = 1;
      let allOrders = [];
      let total = 0;
      do {
        const params = new URLSearchParams({ page: String(exportPage), page_size: String(EXPORT_PAGE_SIZE) });
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (paymentFilter !== "all") params.set("payment_status", paymentFilter);
        if (channelFilter !== "all") params.set("channel", channelFilter);
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        const result = await apiFetch(`/orders?${params.toString()}`);
        allOrders = [...allOrders, ...(result.items || [])];
        total = result.total || allOrders.length;
        exportPage += 1;
      } while (allOrders.length < total);

      const rows = [
        ["Order Number", "Order ID", "Source", "External Customer ID", "Customer", "Phone", "Items", "Items Total", "Delivery Zone", "Delivery Fee", "Grand Total", "Payment Method", "Payment Status", "Order Status", "Address", "Created At", "Cancelled At", "Cancellation Reason"].map(csvCell).join(","),
        ...allOrders.filter((order) => inDateRange(order, fromDate, toDate)).map((order) => [
          order.order_number,
          order.id,
          sourceLabel(order),
          order.external_customer_id,
          order.customer_name,
          order.phone,
          orderItemsText(order),
          order.items_total,
          order.delivery_zone_name,
          order.delivery_fee,
          order.grand_total,
          order.payment_method,
          order.payment_status,
          order.status,
          order.delivery_address_text,
          order.created_at,
          order.cancelled_at,
          order.cancellation_reason,
        ].map(csvCell).join(",")),
      ];
      downloadCsv("orders.csv", rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not export orders.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Completed retail orders collected by your assistant."
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-ink" />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-ink" />
            <Button type="button" variant="outline" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4" strokeWidth={2.5} />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        }
      />
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-h-10 flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3">
            <Search className="h-4 w-4 text-ink-muted" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search order, customer, phone, Telegram ID"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-ink">
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-ink">
              <option value="all">All payments</option>
              {Object.entries(PAYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)} className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-ink">
              <option value="all">All sources</option>
              {Object.entries(CHANNEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
      </div>
      {error && <p className="mb-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>}
      {loading ? <RowListSkeleton rows={5} /> : orders.length === 0 ? <EmptyState icon={PackageCheck} title="No orders yet" description="Orders your assistant confirms will appear here with totals, items, and delivery details." /> : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-heading font-bold text-ink">{order.order_number || `#${order.id}`}</td>
                    <td className="px-4 py-3 font-medium text-ink">{order.customer_name || "Unknown"}<p className="text-xs text-ink-muted">{order.phone || ""}</p></td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-ink-muted">{sourceLabel(order)}</span>
                      <p className="mt-1 text-xs text-ink-muted">{order.external_customer_id || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{order.items.map((item) => `${item.product_name}${item.variant_label ? ` (${item.variant_label})` : ""} x${item.qty}`).join(", ")}</td>
                    <td className="px-4 py-3 font-heading font-bold text-accent-dark">${order.grand_total}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="w-fit rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-soft-text">{STATUS_LABELS[order.status] || order.status}</span>
                        <span className="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-ink-muted">{PAYMENT_LABELS[order.payment_status] || order.payment_status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-accent-soft hover:text-accent-dark" onClick={() => setSelectedOrder(order)} aria-label="View order">
                          <Eye className="h-4 w-4" />
                        </button>
                        {NEXT_STATUS[order.status] && <button disabled={updatingOrderId === order.id} className="font-semibold text-accent-dark hover:underline disabled:cursor-wait disabled:opacity-60" onClick={() => updateStatus(order, NEXT_STATUS[order.status])}>{STATUS_LABELS[NEXT_STATUS[order.status]]}</button>}
                        {order.status !== "cancelled" && order.status !== "shipped" && (
                          <button disabled={updatingOrderId === order.id} className="font-semibold text-red-700 hover:underline disabled:cursor-wait disabled:opacity-60" onClick={() => setCancelOrder(order)}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total || 0} onPageChange={setPage} />
        </>
      )}
      <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <Modal open={Boolean(cancelOrder)} onClose={() => setCancelOrder(null)} size="sm">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
              <XCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold text-ink">Cancel order</h2>
              <p className="text-sm text-ink-muted">{cancelOrder?.order_number || `Order #${cancelOrder?.id}`}</p>
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Reason</span>
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              className="min-h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Customer cancelled, out of stock, duplicate order..."
            />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCancelOrder(null)}>
              Back
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={updatingOrderId === cancelOrder?.id}
              onClick={() => updateStatus(cancelOrder, "cancelled", cancelReason.trim() || null)}
            >
              {updatingOrderId === cancelOrder?.id ? "Cancelling..." : "Cancel order"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
