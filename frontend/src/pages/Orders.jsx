import { Download, Eye, PackageCheck } from "lucide-react";
import { useState } from "react";
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
              <h2 className="font-heading text-xl font-bold text-ink">Order #{order.id}</h2>
              <p className="mt-1 text-sm text-ink-muted">{formatDate(order.created_at)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-soft-text">
              {order.status}
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
  const path = `/orders?page=${page}&page_size=${PAGE_SIZE}`;
  const { data, setData, loading, error: loadError, setError } = useCachedApi(path, { items: [], total: 0 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const error = loadError instanceof ApiError ? loadError.message : loadError;
  const orders = data.items || [];

  async function updateStatus(order, status) {
    try {
      const updated = await apiFetch(`/orders/${order.id}/status`, { method: "PUT", body: { status } });
      setData((current) => ({ ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update order.");
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      let exportPage = 1;
      let allOrders = [];
      let total = 0;
      do {
        const result = await apiFetch(`/orders?page=${exportPage}&page_size=${EXPORT_PAGE_SIZE}`);
        allOrders = [...allOrders, ...(result.items || [])];
        total = result.total || allOrders.length;
        exportPage += 1;
      } while (allOrders.length < total);

      const rows = [
        ["Order ID", "Customer", "Phone", "Items", "Items Total", "Delivery Zone", "Delivery Fee", "Grand Total", "Payment", "Status", "Address", "Created At"].map(csvCell).join(","),
        ...allOrders.filter((order) => inDateRange(order, fromDate, toDate)).map((order) => [
          order.id,
          order.customer_name,
          order.phone,
          orderItemsText(order),
          order.items_total,
          order.delivery_zone_name,
          order.delivery_fee,
          order.grand_total,
          order.payment_method,
          order.status,
          order.delivery_address_text,
          order.created_at,
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
      {error && <p className="mb-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>}
      {loading ? <RowListSkeleton rows={5} /> : orders.length === 0 ? <EmptyState icon={PackageCheck} title="No orders yet" description="Orders your assistant confirms will appear here with totals, items, and delivery details." /> : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-medium text-ink">{order.customer_name || "Unknown"}<p className="text-xs text-ink-muted">{order.phone || ""}</p></td>
                    <td className="px-4 py-3 text-ink-muted">{order.items.map((item) => `${item.product_name}${item.variant_label ? ` (${item.variant_label})` : ""} x${item.qty}`).join(", ")}</td>
                    <td className="px-4 py-3 font-heading font-bold text-accent-dark">${order.grand_total}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-soft-text">{order.status}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-accent-soft hover:text-accent-dark" onClick={() => setSelectedOrder(order)} aria-label="View order">
                          <Eye className="h-4 w-4" />
                        </button>
                        {NEXT_STATUS[order.status] && <button className="font-semibold text-accent-dark hover:underline" onClick={() => updateStatus(order, NEXT_STATUS[order.status])}>{NEXT_STATUS[order.status]}</button>}
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
    </div>
  );
}
