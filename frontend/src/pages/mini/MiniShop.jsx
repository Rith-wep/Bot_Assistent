import { ArrowLeft, Minus, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError, apiFetch } from "../../api/client";

function getTelegramWebApp() {
  return window.Telegram?.WebApp || null;
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function productName(product) {
  return product.name_en || product.name_km || "Product";
}

function MiniSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="aspect-square animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function ProductCard({ product, onOpen }) {
  const photo = product.photo_urls?.[0];
  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className="min-w-0 rounded-xl border border-gray-100 bg-white p-2 text-left shadow-sm transition active:scale-[0.99]"
    >
      <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
        {photo ? (
          <img src={photo} alt={productName(product)} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <ShoppingBag className="h-7 w-7" />
          </div>
        )}
      </div>
      <div className="mt-2 min-w-0">
        <p className="truncate text-sm font-bold text-slate-950">{productName(product)}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-accent-dark">{formatMoney(product.price)}</span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              product.in_stock ? "bg-accent-soft text-accent-dark" : "bg-red-50 text-red-700"
            }`}
          >
            {product.in_stock ? "Stock" : "Out"}
          </span>
        </div>
      </div>
    </button>
  );
}

function ProductDetail({ product, onAddToCart, onClose }) {
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants?.[0]?.id || null);
  const [quantity, setQuantity] = useState(1);
  const selectedVariant =
    product.variants?.find((variant) => variant.id === selectedVariantId) || product.variants?.[0];
  const maxQuantity = selectedVariant?.stock_quantity || (product.in_stock ? 99 : 0);

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-white">
      <div className="mx-auto min-h-screen max-w-md pb-8">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-slate-700"
            aria-label="Back to catalog"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="font-heading text-sm font-bold text-slate-950">Product details</p>
          <div className="h-10 w-10" />
        </div>

        <div className="grid grid-cols-1 gap-2 px-4 pt-4">
          <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
            {product.photo_urls?.[0] ? (
              <img src={product.photo_urls[0]} alt={productName(product)} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                <ShoppingBag className="h-10 w-10" />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">
            {product.category || "Catalog"}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold text-slate-950">{productName(product)}</h1>
          <p className="mt-2 text-lg font-bold text-accent-dark">
            {formatMoney(selectedVariant?.price || product.price)}
          </p>
          {(product.description_en || product.description_km) && (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {product.description_en || product.description_km}
            </p>
          )}

          {product.variants?.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-bold text-slate-950">Choose option</p>
              <div className="grid gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={variant.stock_quantity <= 0}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition disabled:opacity-50 ${
                      selectedVariant?.id === variant.id
                        ? "border-accent bg-accent-soft/50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <span className="font-semibold text-slate-900">{variant.label}</span>
                    <span className="font-bold text-accent-dark">{formatMoney(variant.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-700"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-10 text-center font-heading text-lg font-bold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-700"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            disabled={!product.in_stock || maxQuantity <= 0}
            onClick={() => {
              onAddToCart(product, selectedVariant, quantity);
              onClose();
            }}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-dark px-4 py-3 text-sm font-bold text-white disabled:bg-gray-300"
          >
            <ShoppingBag className="h-4 w-4" />
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ cartItems, onUpdateQty, onRemove, onCheckout, onClose }) {
  const subtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-30 bg-slate-950/40">
      <button className="h-full w-full cursor-default" type="button" onClick={onClose} aria-label="Close cart" />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <div>
            <p className="font-heading text-lg font-bold text-slate-950">Cart</p>
            <p className="text-sm text-slate-500">{cartItems.length} item(s)</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-slate-700"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[54vh] overflow-y-auto px-4 py-3">
          {cartItems.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Your cart is empty.
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.key} className="flex gap-3 rounded-xl border border-gray-100 p-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {item.photoUrl ? (
                      <img src={item.photoUrl} alt={item.productName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">{item.productName}</p>
                        {item.variantLabel && <p className="text-xs text-slate-500">{item.variantLabel}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(item.key)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-accent-dark">
                        {formatMoney(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-4 py-4">
          <div className="mb-4 flex items-center justify-between font-heading text-lg font-bold">
            <span>Subtotal</span>
            <span className="text-accent-dark">{formatMoney(subtotal)}</span>
          </div>
          <button
            type="button"
            disabled={cartItems.length === 0}
            onClick={onCheckout}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-accent-dark px-4 py-3 text-sm font-bold text-white disabled:bg-gray-300"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckoutView({ cartItems, submitting, error, successOrder, onSubmit, onClose }) {
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    deliveryAddressText: "",
    paymentMethod: "cod",
  });
  const subtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-white">
      <div className="mx-auto min-h-screen max-w-md pb-8">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-slate-700"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="font-heading text-sm font-bold text-slate-950">Checkout</p>
          <div className="h-10 w-10" />
        </div>

        <div className="px-4 pt-5">
          {successOrder ? (
            <div className="rounded-2xl border border-accent bg-accent-soft p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-dark text-white">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h1 className="mt-4 font-heading text-xl font-bold text-slate-950">Order received</h1>
              <p className="mt-2 text-sm text-slate-600">
                {successOrder.order_number} • Total {formatMoney(successOrder.grand_total)}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-accent-dark px-4 py-3 text-sm font-bold text-white"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between font-heading text-lg font-bold">
                  <span>Total</span>
                  <span className="text-accent-dark">{formatMoney(subtotal)}</span>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  {cartItems.map((item) => (
                    <div key={item.key} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {item.productName}
                        {item.variantLabel ? ` (${item.variantLabel})` : ""} x{item.quantity}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatMoney(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-slate-950">Name</span>
                <input
                  value={form.customerName}
                  onChange={(event) => updateField("customerName", event.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-accent"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-950">Phone</span>
                <input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  required
                  inputMode="tel"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-accent"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-950">Delivery address</span>
                <textarea
                  value={form.deliveryAddressText}
                  onChange={(event) => updateField("deliveryAddressText", event.target.value)}
                  required
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-accent"
                />
              </label>

              <div>
                <p className="text-sm font-bold text-slate-950">Payment</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    ["cod", "Cash on delivery"],
                    ["prepaid", "Manual payment"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateField("paymentMethod", value)}
                      className={`rounded-xl border px-3 py-3 text-sm font-bold ${
                        form.paymentMethod === value
                          ? "border-accent bg-accent-soft text-accent-dark"
                          : "border-gray-200 bg-white text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || cartItems.length === 0}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-accent-dark px-4 py-3 text-sm font-bold text-white disabled:bg-gray-300"
              >
                {submitting ? "Creating order..." : "Place order"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MiniShop() {
  const { businessId } = useParams();
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [successOrder, setSuccessOrder] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    webApp?.ready?.();
    webApp?.expand?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setLoading(true);
      setError("");
      try {
        const initData = getTelegramWebApp()?.initData || "";
        if (!initData) {
          throw new Error("Open this shop from Telegram to view the catalog.");
        }
        const data = await apiFetch(`/mini/catalog/${businessId}`, {
          method: "POST",
          auth: false,
          body: { init_data: initData },
        });
        if (!cancelled) setCatalog(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : err.message || "Could not load catalog.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const products = catalog?.products || [];
  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const matchesQuery =
        !needle ||
        [product.name_en, product.name_km, product.category]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      return matchesCategory && matchesQuery;
    });
  }, [category, products, query]);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(product, variant, quantity) {
    const key = `${product.id}:${variant?.id || "base"}`;
    const unitPrice = Number(variant?.price || product.price || 0);
    setCartItems((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...current,
        {
          key,
          productId: product.id,
          variantId: variant?.id || null,
          productName: productName(product),
          variantLabel: variant?.label || null,
          unitPrice,
          quantity,
          photoUrl: product.photo_urls?.[0] || null,
        },
      ];
    });
  }

  function updateCartQuantity(key, quantity) {
    if (quantity < 1) {
      setCartItems((current) => current.filter((item) => item.key !== key));
      return;
    }
    setCartItems((current) =>
      current.map((item) => (item.key === key ? { ...item, quantity } : item))
    );
  }

  async function submitCheckout(form) {
    setCheckoutSubmitting(true);
    setCheckoutError("");
    try {
      const initData = getTelegramWebApp()?.initData || "";
      const data = await apiFetch(`/mini/checkout/${businessId}`, {
        method: "POST",
        auth: false,
        body: {
          init_data: initData,
          customer_name: form.customerName,
          phone: form.phone,
          delivery_address_text: form.deliveryAddressText,
          payment_method: form.paymentMethod,
          items: cartItems.map((item) => ({
            product_id: item.productId,
            variant_id: item.variantId,
            qty: item.quantity,
          })),
        },
      });
      setSuccessOrder(data.order);
      setCartItems([]);
      setCartOpen(false);
    } catch (err) {
      setCheckoutError(err instanceof ApiError ? err.message : err.message || "Could not create order.");
    } finally {
      setCheckoutSubmitting(false);
    }
  }

  function closeCheckout() {
    setCheckoutOpen(false);
    setCheckoutError("");
    if (successOrder) setSuccessOrder(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-md px-4 pb-8 pt-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">Telegram Shop</p>
            <h1 className="font-heading text-2xl font-bold">Catalog</h1>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-dark px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>
        </header>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>

        {catalog?.categories?.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {["all", ...catalog.categories].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                  category === item
                    ? "bg-accent-dark text-white"
                    : "border border-gray-200 bg-white text-slate-600"
                }`}
              >
                {item === "all" ? "All" : item}
              </button>
            ))}
          </div>
        )}

        <main className="mt-5">
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {loading ? (
            <MiniSkeleton />
          ) : !error && filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-10 text-center text-sm text-gray-500">
              No products found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} onOpen={setSelectedProduct} />
              ))}
            </div>
          )}
        </main>
      </div>

      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onAddToCart={addToCart}
          onClose={() => setSelectedProduct(null)}
        />
      )}
      {cartOpen && (
        <CartDrawer
          cartItems={cartItems}
          onUpdateQty={updateCartQuantity}
          onRemove={(key) => setCartItems((current) => current.filter((item) => item.key !== key))}
          onCheckout={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
          onClose={() => setCartOpen(false)}
        />
      )}
      {checkoutOpen && (
        <CheckoutView
          cartItems={cartItems}
          submitting={checkoutSubmitting}
          error={checkoutError}
          successOrder={successOrder}
          onSubmit={submitCheckout}
          onClose={closeCheckout}
        />
      )}
    </div>
  );
}
