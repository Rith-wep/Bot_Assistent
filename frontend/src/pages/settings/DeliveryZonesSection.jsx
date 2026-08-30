import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import { useCachedApi } from "../../api/useCachedApi";
import Button from "../../components/Button";
import SectionCard from "../../components/SectionCard";
import { RowListSkeleton } from "../../components/Skeleton";

const EMPTY_ZONE = { zone_name_en: "", zone_name_km: "", fee: "", estimated_days: "", sort_order: 0 };
const fieldClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export default function DeliveryZonesSection({ showToast }) {
  const { data: zones, setData: setZones, loading, error: loadError, setError } = useCachedApi("/delivery-zones", []);
  const [form, setForm] = useState(EMPTY_ZONE);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const error = loadError instanceof ApiError ? loadError.message : loadError;

  async function reload() {
    setZones(await apiFetch("/delivery-zones"));
  }

  function edit(zone) {
    setEditingId(zone.id);
    setForm({
      zone_name_en: zone.zone_name_en || "",
      zone_name_km: zone.zone_name_km || "",
      fee: zone.fee || "",
      estimated_days: zone.estimated_days || "",
      sort_order: zone.sort_order || 0,
    });
  }

  function reset() {
    setForm(EMPTY_ZONE);
    setEditingId(null);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch(editingId ? `/delivery-zones/${editingId}` : "/delivery-zones", {
        method: editingId ? "PUT" : "POST",
        body: { ...form, fee: Number(form.fee || 0), sort_order: Number(form.sort_order || 0) },
      });
      reset();
      await reload();
      showToast("Delivery zone saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save delivery zone.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      await apiFetch(`/delivery-zones/${id}`, { method: "DELETE" });
      await reload();
      showToast("Delivery zone deleted.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete delivery zone.");
    }
  }

  return (
    <SectionCard title="Retail & delivery" description="Set delivery zones, fees, and ETA information used in retail order totals.">
      {error && <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>}
      {loading ? <RowListSkeleton rows={2} /> : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <div className="grid grid-cols-[1.3fr_1.3fr_100px_120px_96px] bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span>Zone EN</span>
            <span>Zone KM</span>
            <span>Fee</span>
            <span>ETA</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-gray-100 bg-white">
            {zones.length === 0 && <p className="px-4 py-5 text-sm text-gray-500">No delivery zones yet.</p>}
            {zones.map((zone) => (
              <div key={zone.id} className="grid grid-cols-[1.3fr_1.3fr_100px_120px_96px] items-center gap-3 px-4 py-3 text-sm">
                <span className="truncate font-medium text-gray-900">{zone.zone_name_en}</span>
                <span className="truncate text-gray-500">{zone.zone_name_km || "-"}</span>
                <span className="font-semibold text-accent-dark">${zone.fee}</span>
                <span className="text-gray-500">{zone.estimated_days || "-"}</span>
                <span className="flex justify-end gap-1">
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-accent-soft hover:text-accent-dark" onClick={() => edit(zone)} aria-label="Edit zone">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600" onClick={() => remove(zone.id)} aria-label="Delete zone">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-heading text-sm font-bold text-gray-900">{editingId ? "Edit delivery zone" : "Add delivery zone"}</h3>
          {editingId && (
            <button type="button" onClick={reset} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Cancel edit">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px_160px_auto]">
          <input className={fieldClass} placeholder="Zone EN" value={form.zone_name_en} onChange={(e) => setForm((f) => ({ ...f, zone_name_en: e.target.value }))} required />
          <input className={fieldClass} placeholder="Zone KM" value={form.zone_name_km} onChange={(e) => setForm((f) => ({ ...f, zone_name_km: e.target.value }))} />
          <input className={fieldClass} placeholder="Fee" type="number" min="0" step="0.01" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))} required />
          <input className={fieldClass} placeholder="ETA" value={form.estimated_days} onChange={(e) => setForm((f) => ({ ...f, estimated_days: e.target.value }))} />
          <Button type="submit" disabled={saving}>
            <Plus className="h-4 w-4" />
            {saving ? "Saving..." : editingId ? "Save" : "Add"}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
