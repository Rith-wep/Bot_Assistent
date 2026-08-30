import {
  DollarSign,
  Image,
  ImagePlus,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { apiFetch, ApiError } from "../api/client";
import { useCachedApi } from "../api/useCachedApi";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import { KnowledgeListSkeleton } from "../components/Skeleton";

const EMPTY_VARIANT = {
  variant_label: "",
  price_override: "",
  stock_quantity: 0,
  sku: "",
  is_active: true,
};

const EMPTY_PRODUCT = {
  name_en: "",
  name_km: "",
  description_en: "",
  description_km: "",
  category: "",
  base_price: "",
  photo_urls: [],
  is_active: true,
  sort_order: 0,
  variants: [{ ...EMPTY_VARIANT }],
};

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted";

async function uploadProductPhoto(file) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary upload is not configured.");
  }
  if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 5 MB.");
  }
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body }
  );
  const data = await response.json();
  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Upload failed");
  }
  return data.secure_url;
}

function normalizeInitialProduct(initial) {
  return {
    ...EMPTY_PRODUCT,
    ...initial,
    photo_urls: initial.photo_urls || [],
    variants: initial.variants?.length
      ? initial.variants.map((variant) => ({ ...EMPTY_VARIANT, ...variant }))
      : [{ ...EMPTY_VARIANT }],
  };
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-accent-dark" : "bg-gray-300"
      }`}
      aria-label={label}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function MediaUploader({
  photos,
  uploading,
  uploadError,
  onFiles,
  onAddUrl,
  onUpdateUrl,
  onRemove,
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-sm font-bold text-ink">Media</h3>
          <p className="text-sm text-ink-muted">Upload or paste up to 8 product photos.</p>
        </div>
        {photos.length < 8 && (
          <Button type="button" variant="secondary" className="shrink-0" onClick={() => onAddUrl()}>
            <ImagePlus className="h-4 w-4" />
            URL
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div
          className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition-colors hover:border-accent"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            onFiles(event.dataTransfer.files);
          }}
        >
          <Upload className="h-6 w-6 text-accent-dark" />
          <p className="mt-3 text-sm font-semibold text-ink">Drag photos here</p>
          <p className="mt-1 text-xs text-ink-muted">PNG, JPG, or WEBP under 5 MB</p>
          <label className="mt-4 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-soft-text">
            {uploading ? "Uploading..." : "Choose files"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={(event) => onFiles(event.target.files)}
            />
          </label>
        </div>

        <div className="min-w-0">
          {uploadError && (
            <p className="mb-3 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">
              {uploadError}
            </p>
          )}
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {photos.map((url, index) => (
                <div key={`${url}-${index}`} className="group relative">
                  <div className="aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                    {url ? (
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-ink-muted">
                        <Image className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-error-soft hover:text-error"
                    onClick={() => onRemove(index)}
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <input
                    className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Image URL"
                    value={url || ""}
                    onChange={(event) => onUpdateUrl(index, event.target.value)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-44 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-ink-muted">
              No product photos added.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function VariantsTable({ variants, onUpdate, onAdd, onRemove }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h3 className="font-heading text-sm font-bold text-ink">Variants</h3>
          <p className="text-sm text-ink-muted">Manage sizes, colors, SKUs, and stock.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] table-fixed text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="w-[28%] px-4 py-3">Variant Label</th>
              <th className="w-[20%] px-3 py-3">Price Override</th>
              <th className="w-[22%] px-3 py-3">Stock Quantity</th>
              <th className="w-[18%] px-3 py-3">SKU</th>
              <th className="w-[7%] px-3 py-3 text-center">Active</th>
              <th className="w-[5%] px-3 py-3 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {variants.map((variant, index) => {
              const stock = Number(variant.stock_quantity || 0);
              return (
                <tr key={index} className="align-top">
                  <td className="px-4 py-3">
                    <input
                      className={inputClass}
                      placeholder="Red / Size M"
                      value={variant.variant_label}
                      onChange={(event) =>
                        onUpdate(index, "variant_label", event.target.value)
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">
                        $
                      </span>
                      <input
                        className={`${inputClass} pl-7`}
                        placeholder="Optional"
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.price_override || ""}
                        onChange={(event) =>
                          onUpdate(index, "price_override", event.target.value)
                        }
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        className={`${inputClass} max-w-28`}
                        type="number"
                        min="0"
                        value={variant.stock_quantity}
                        onChange={(event) =>
                          onUpdate(index, "stock_quantity", event.target.value)
                        }
                      />
                      {stock === 0 ? (
                        <span className="whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">
                          Out of stock
                        </span>
                      ) : (
                        <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                          In stock
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className={inputClass}
                      placeholder="SKU"
                      value={variant.sku || ""}
                      onChange={(event) => onUpdate(index, "sku", event.target.value)}
                    />
                  </td>
                  <td className="px-3 py-4 text-center">
                    <Toggle
                      checked={variant.is_active}
                      onChange={(value) => onUpdate(index, "is_active", value)}
                      label="Toggle variant active state"
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-ink-muted transition-colors hover:border-red-100 hover:bg-error-soft hover:text-error"
                      onClick={() => onRemove(index)}
                      aria-label="Remove variant"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-100 p-4">
        <Button type="button" variant="secondary" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add another variant
        </Button>
      </div>
    </section>
  );
}

function ProductForm({ initial = EMPTY_PRODUCT, onSubmit, onCancel }) {
  const [form, setForm] = useState(normalizeInitialProduct(initial));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updatePhoto = (index, value) =>
    setForm((current) => ({
      ...current,
      photo_urls: current.photo_urls.map((url, i) => (i === index ? value : url)),
    }));
  const addPhotoUrl = (url = "") =>
    setForm((current) => ({
      ...current,
      photo_urls: current.photo_urls.length < 8 ? [...current.photo_urls, url] : current.photo_urls,
    }));
  const removePhotoUrl = (index) =>
    setForm((current) => ({
      ...current,
      photo_urls: current.photo_urls.filter((_, i) => i !== index),
    }));
  const updateVariant = (index, field, value) =>
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      ),
    }));
  const addVariant = () =>
    setForm((current) => ({ ...current, variants: [...current.variants, { ...EMPTY_VARIANT }] }));
  const removeVariant = (index) =>
    setForm((current) => ({
      ...current,
      variants:
        current.variants.length > 1
          ? current.variants.filter((_, i) => i !== index)
          : [{ ...EMPTY_VARIANT }],
    }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await onSubmit({
        ...form,
        base_price: Number(form.base_price || 0),
        photo_urls: form.photo_urls.map((url) => url.trim()).filter(Boolean),
        variants: form.variants
          .filter((variant) => variant.variant_label.trim())
          .map((variant) => ({
            ...variant,
            variant_label: variant.variant_label.trim(),
            price_override: variant.price_override === "" ? null : Number(variant.price_override),
            stock_quantity: Number(variant.stock_quantity || 0),
            sku: variant.sku || null,
          })),
      });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFiles(files) {
    const images = Array.from(files || []);
    if (images.length === 0) return;
    setUploading(true);
    setUploadError("");
    try {
      const availableSlots = Math.max(0, 8 - form.photo_urls.length);
      const urls = [];
      for (const file of images.slice(0, availableSlots)) {
        urls.push(await uploadProductPhoto(file));
      }
      setForm((current) => ({ ...current, photo_urls: [...current.photo_urls, ...urls] }));
    } catch (err) {
      setUploadError(err.message || "Could not upload image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
        <div>
          <h2 className="font-heading text-xl font-bold text-ink">
            {initial.id ? "Edit product" : "Create product"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Build a catalog item with media and stock.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink"
          aria-label="Close product drawer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {formError && (
          <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{formError}</p>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-sm font-bold text-ink">Basic Info</h3>
              <p className="text-sm text-ink-muted">Names, category, and catalog price.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink-muted">Active</span>
              <Toggle
                checked={form.is_active}
                onChange={(value) => update("is_active", value)}
                label="Toggle product active state"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name EN">
              <input
                className={inputClass}
                value={form.name_en}
                onChange={(event) => update("name_en", event.target.value)}
                required
              />
            </Field>
            <Field label="Name KM">
              <input
                className={inputClass}
                value={form.name_km || ""}
                onChange={(event) => update("name_km", event.target.value)}
              />
            </Field>
            <Field label="Category">
              <input
                className={inputClass}
                value={form.category || ""}
                onChange={(event) => update("category", event.target.value)}
              />
            </Field>
            <Field label="Base Price">
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  className={`${inputClass} pl-9`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.base_price}
                  onChange={(event) => update("base_price", event.target.value)}
                  required
                />
              </div>
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-4">
            <h3 className="font-heading text-sm font-bold text-ink">Descriptions</h3>
            <p className="text-sm text-ink-muted">Keep both language descriptions aligned.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Description (English)">
              <textarea
                className={`${inputClass} min-h-32 resize-y`}
                value={form.description_en || ""}
                onChange={(event) => update("description_en", event.target.value)}
              />
            </Field>
            <Field label="Description (Khmer)">
              <textarea
                className={`${inputClass} min-h-32 resize-y`}
                value={form.description_km || ""}
                onChange={(event) => update("description_km", event.target.value)}
              />
            </Field>
          </div>
        </section>

        <MediaUploader
          photos={form.photo_urls}
          uploading={uploading}
          uploadError={uploadError}
          onFiles={handleFiles}
          onAddUrl={addPhotoUrl}
          onUpdateUrl={updatePhoto}
          onRemove={removePhotoUrl}
        />

        <VariantsTable
          variants={form.variants}
          onUpdate={updateVariant}
          onAdd={addVariant}
          onRemove={removeVariant}
        />
      </div>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-white/95 px-6 py-4 shadow-[0_-8px_20px_rgba(15,23,42,0.06)] backdrop-blur">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Product"}
        </Button>
      </div>
    </form>
  );
}

function ProductDrawer({ product, onSubmit, onClose }) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
      <button className="hidden flex-1 cursor-default lg:block" type="button" onClick={onClose} />
      <div className="h-full w-full max-w-5xl bg-white shadow-2xl">
        <ProductForm
          initial={product.mode === "create" ? EMPTY_PRODUCT : product}
          onSubmit={(values) => onSubmit(values, product.mode === "create" ? null : product.id)}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

function AiProductAdd({ onSaved, onCancel }) {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function extract() {
    setBusy(true);
    setError("");
    try {
      const data = await apiFetch("/products/ai-extract", { method: "POST", body: { text } });
      setDrafts(data.products || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not extract products.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAll() {
    setBusy(true);
    setError("");
    try {
      for (const product of drafts) {
        await apiFetch("/products", { method: "POST", body: product });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save extracted products.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 space-y-4 rounded-xl border border-accent/30 bg-accent-soft/40 p-5">
      <div>
        <h2 className="font-heading text-lg font-bold text-ink">Add Products With AI</h2>
        <p className="text-sm text-ink-muted">Paste a messy catalog list and review extracted drafts.</p>
      </div>
      <textarea
        className="min-h-40 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        placeholder="Paste products with prices, colors, sizes, stock, and image URLs."
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {error && <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={extract} disabled={busy || !text.trim()}>
          <Sparkles className="h-4 w-4" />
          Extract
        </Button>
      </div>
      {drafts.length > 0 && (
        <div className="space-y-3">
          {drafts.map((product, index) => (
            <div key={index} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="font-heading font-bold text-ink">{product.name_en}</p>
              <p className="text-sm text-ink-muted">{product.variants.length} variant(s)</p>
            </div>
          ))}
          <Button type="button" onClick={saveAll} disabled={busy}>
            Save {drafts.length} product(s)
          </Button>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onEdit, onRemove }) {
  const photos = product.photo_urls || [];
  const activeVariants = product.variants?.filter((variant) => variant.is_active).length || 0;
  const totalStock =
    product.variants?.reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0) || 0;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="grid aspect-[4/3] grid-cols-2 gap-1 overflow-hidden rounded-xl bg-gray-100">
        {photos.slice(0, 4).length > 0 ? (
          photos.slice(0, 4).map((url, index) => (
            <img
              key={`${url}-${index}`}
              src={url}
              alt={`${product.name_en} ${index + 1}`}
              className={`h-full w-full object-cover ${photos.length === 1 ? "col-span-2 row-span-2" : ""}`}
            />
          ))
        ) : (
          <div className="col-span-2 flex h-full items-center justify-center text-ink-muted">
            <Image className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-heading font-bold text-ink">{product.name_en}</h3>
            {!product.is_active && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-ink-muted">
                Draft
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-muted">{product.category || "Uncategorized"}</p>
          <p className="mt-2 text-sm font-semibold text-accent-dark">${product.base_price}</p>
        </div>
        <div className="flex gap-1">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-dark"
            onClick={() => onEdit(product)}
            aria-label="Edit product"
            type="button"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-error-soft hover:text-error"
            onClick={() => onRemove(product.id)}
            aria-label="Delete product"
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Variants</p>
          <p className="font-heading font-bold text-ink">
            {activeVariants}/{product.variants?.length || 0}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Stock</p>
          <p className={`font-heading font-bold ${totalStock === 0 ? "text-red-700" : "text-ink"}`}>
            {totalStock}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const {
    data: products,
    setData: setProducts,
    loading,
    error: loadError,
    setError,
  } = useCachedApi("/products", []);
  const [drawerProduct, setDrawerProduct] = useState(null);
  const [showAi, setShowAi] = useState(false);
  const error = loadError instanceof ApiError ? loadError.message : loadError;

  async function reload() {
    setProducts(await apiFetch("/products"));
  }

  async function save(product, id) {
    await apiFetch(id ? `/products/${id}` : "/products", {
      method: id ? "PUT" : "POST",
      body: product,
    });
    setDrawerProduct(null);
    await reload();
  }

  async function remove(id) {
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete product.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Your retail catalog, stock, variants, and product photos."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDrawerProduct({ mode: "create" })}>
              <Plus className="h-4 w-4" />
              Add product
            </Button>
            <Button onClick={() => setShowAi((current) => !current)}>
              <Sparkles className="h-4 w-4" />
              Add with AI
            </Button>
          </div>
        }
      />

      {error && <p className="mb-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>}

      {showAi && (
        <AiProductAdd
          onSaved={async () => {
            setShowAi(false);
            await reload();
          }}
          onCancel={() => setShowAi(false)}
        />
      )}

      {loading ? (
        <KnowledgeListSkeleton />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Image}
          title="No products yet"
          description="Add products manually or paste a product list and let AI prepare variants for review."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={setDrawerProduct}
              onRemove={remove}
            />
          ))}
        </div>
      )}

      <ProductDrawer
        product={drawerProduct}
        onSubmit={save}
        onClose={() => setDrawerProduct(null)}
      />
    </div>
  );
}
