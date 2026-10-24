"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, formatCurrency } from "@/lib/storefront";
import { AdminRowsSkeleton, Skeleton } from "@/components/ui/Skeleton";
import ProductImageUpload from "@/components/admin/ProductImageUpload";
import ProductTryOnImageUpload from "@/components/admin/ProductTryOnImageUpload";
import FeedbackAdminPanel from "@/components/admin/FeedbackAdminPanel";

const userActionStyles = {
  pending: "border-amber-200 bg-amber-100 text-amber-900",
  confirmed: "border-emerald-200 bg-emerald-100 text-emerald-900",
  canceled: "border-red-200 bg-red-100 text-red-900",
};
const statuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
function formatOrderDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Asia/Karachi",
  }).format(date);
}
function UserActionBadge({ value }) {
  const action = ["pending", "confirmed", "canceled"].includes(value)
    ? value
    : "pending";
  return (
    <span
      aria-label={"User action: " + action}
      className={
        "rounded-full border px-3 py-1 text-xs font-medium capitalize " +
        userActionStyles[action]
      }
    >
      {action}
    </span>
  );
}
const blankProduct = {
  name: "",
  category: "Eyeglasses",
  shape: "Round",
  material: "Acetate",
  gender: "Women",
  price: "",
  salePrice: "",
  saleLabel: false,
  image: "",
  imageFileId: "",
  imageEnhanced: false,
  tryOnImage: "",
  stock: 0,
  description: "",
  colors: [{ name: "Onyx", swatch: "#171717" }],
  measurements: { lens: 50, bridge: 20, temple: 145 },
};
const field =
  "mt-1 h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm";

function announceProductChange() {
  window.dispatchEvent(new Event("zv-products-updated"));
  try {
    window.localStorage.setItem("zv-products-updated", String(Date.now()));
  } catch {}
}
export default function AdminDashboard() {
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [data, setData] = useState({ orders: [], customers: [], settings: {} });
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingOrderNo, setUpdatingOrderNo] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderActionFilter, setOrderActionFilter] = useState("all");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const responses = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/admin", { cache: "no-store" }),
      ]);
      if (responses[0].ok) setProducts(await responses[0].json());
      if (responses[1].ok) setData(await responses[1].json());
      else
        setNotice("Could not load store data. Check the MongoDB connection.");
    } catch {
      setNotice("Could not load store data. Check the MongoDB connection.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const normalizedOrderSearch = orderSearch.trim().toLowerCase();
  const filteredOrders = (Array.isArray(data.orders) ? data.orders : []).filter(
    (order) => {
      const rawAction = String(order.user_action || "").toLowerCase();
      const action = ["pending", "confirmed", "canceled"].includes(rawAction)
        ? rawAction
        : "pending";
      const searchableValues = [
        order.orderNo,
        order.customerName,
        order.email,
        order.phone,
        ...(Array.isArray(order.items)
          ? order.items.flatMap((item) => [item.name, item.productId])
          : []),
      ];
      const matchesSearch =
        !normalizedOrderSearch ||
        searchableValues.some((value) =>
          String(value ?? "").toLowerCase().includes(normalizedOrderSearch),
        );
      const matchesStatus =
        orderStatusFilter === "all" || order.status === orderStatusFilter;
      const matchesAction =
        orderActionFilter === "all" || action === orderActionFilter;
      return matchesSearch && matchesStatus && matchesAction;
    },
  );
  function clearOrderFilters() {
    setOrderSearch("");
    setOrderStatusFilter("all");
    setOrderActionFilter("all");
  }
  async function saveProduct(event) {
    event.preventDefault();
    if (imageUploading) {
      setNotice("Please wait for the product image upload to finish.");
      return;
    }
    setBusy(true);
    try {
      const method = editing.id ? "PUT" : "POST";
      const url =
        "/api/products" +
        (editing.id ? "?id=" + encodeURIComponent(editing.id) : "");
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (Boolean(result.saleLabel) !== (editing.saleLabel === true)) {
        throw new Error(
          "Sale label did not save. Restart the app and try again.",
        );
      }
      announceProductChange();
      setNotice("Product saved to the store.");
      await load();
    } catch (error) {
      setNotice(error.message || "Could not save the product.");
    } finally {
      setBusy(false);
    }
  }
  async function toggleSaleLabel(product) {
    const saleLabel = product.saleLabel !== true;
    setBusy(true);
    try {
      const response = await fetch(
        "/api/products?id=" + encodeURIComponent(product.id),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saleLabel }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not update the Sale label.");
      if (result.saleLabel !== saleLabel) {
        throw new Error(
          "Sale label did not save. Restart the app and try again.",
        );
      }
      announceProductChange();
      await load();
    } catch (error) {
      setNotice(error.message || "Could not update the Sale label.");
    } finally {
      setBusy(false);
    }
  }
  async function deleteProduct(product) {
    if (!confirm("Delete " + product.name + "?")) return;
    const response = await fetch(
      "/api/products?id=" + encodeURIComponent(product.id),
      { method: "DELETE" },
    );
    const result = await response.json();
    setNotice(response.ok ? product.name + " deleted." : result.error);
    if (response.ok) announceProductChange();
    if (response.ok) await load();
  }
  async function changeOrder(orderNo, status) {
    setUpdatingOrderNo(orderNo);
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "order", orderNo, status }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not update the order status.");
      }
      setNotice("Order status updated.");
      await load();
    } catch (error) {
      setNotice(error.message || "Could not update the order status.");
    } finally {
      setUpdatingOrderNo("");
    }
  }
  async function saveSettings(event) {
    event.preventDefault();
    const settings = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    const response = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "settings", settings }),
    });
    const result = await response.json();
    setNotice(response.ok ? "Store settings saved." : result.error);
    if (response.ok) window.dispatchEvent(new Event("zv-settings-updated"));
    if (response.ok) await load();
  }
  const revenue = data.orders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  return (
    <main className="container-z py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-black/50">
            Store management
          </p>
          <h1 className="mt-2 font-space text-4xl sm:text-5xl">Admin</h1>
          <p className="mt-2 text-sm text-black/55">
            Manage products, stock, customer orders, and store details.
          </p>
        </div>
        <Link
          href="/shop"
          className="rounded-full bg-black px-5 py-3 text-sm text-white"
        >
          View shop
        </Link>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Products", products.length],
          ["Orders", data.orders.length],
          ["Revenue", formatCurrency(revenue)],
          ["Customers", data.customers.length],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-black/10 bg-white/60 p-4"
          >
            <p className="text-xs uppercase text-black/50">{label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-20" />
            ) : (
              <p className="mt-1 font-space text-2xl">{value}</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-7 flex gap-1 overflow-x-auto border-b border-black/10">
        {[
          ["products", "Products"],
          ["orders", "Orders"],
          ["customers", "Customers"],
          ["feedback", "Feedback"],
          ["settings", "Store settings"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              if (id === "orders") load();
            }}
            className={
              "shrink-0 px-4 py-3 text-sm " +
              (tab === id
                ? "border-b-2 border-black font-medium"
                : "text-black/55")
            }
          >
            {label}
          </button>
        ))}
      </div>
      {notice && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {notice}
          <button
            onClick={() => setNotice("")}
            className="float-right"
            aria-label="Dismiss"
          >
            ×
          </button>
        </p>
      )}
      {tab === "products" && (
        <section className="mt-5">
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                setImageUploading(false);
                setEditing({
                  ...blankProduct,
                  measurements: { ...blankProduct.measurements },
                });
              }}
              className="rounded-full bg-black px-5 py-2.5 text-sm text-white"
            >
              Add product
            </button>
          </div>
          <div className="grid gap-3">
            {loading
              ? Array.from({ length: 4 }, (_, index) => (
                  <article
                    key={"product-skeleton-" + index}
                    className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-black/10 bg-white/60 p-3 sm:flex sm:gap-4 sm:p-4"
                  >
                    <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </article>
                ))
              : products.map((product) => (
                  <article
                    key={product.id}
                    className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-black/10 bg-white/60 p-3 sm:flex sm:gap-4 sm:p-4"
                  >
                    <Image
                      src={product.image}
                      alt=""
                      width={60}
                      height={60}
                      className="h-14 w-14 shrink-0 rounded-xl bg-[#f1ece4] object-contain p-2"
                    />
                    <div className="min-w-0 sm:flex-1">
                      <p className="truncate font-medium">
                        {product.name}
                        {product.saleLabel && (
                          <span className="ml-2 rounded-full bg-red-700 px-2 py-0.5 text-[10px] text-white">
                            Sale
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-black/55">
                        {product.category} |{" "}
                        {formatCurrency(product.salePrice || product.price)} |{" "}
                        {product.stock} in stock
                      </p>
                    </div>
                    <div className="col-start-2 flex flex-wrap justify-end gap-2 sm:ml-auto">
                      <button
                        onClick={() => {
                          setImageUploading(false);
                          setEditing({
                            ...product,
                            colors:
                              Array.isArray(product.colors) &&
                              product.colors.length
                                ? product.colors
                                : [{ name: "Onyx", swatch: "#171717" }],
                          });
                        }}
                        className="rounded-full border px-3 py-2 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleSaleLabel(product)}
                        className="rounded-full border border-red-200 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
                      >
                        {product.saleLabel
                          ? "Remove Sale label"
                          : "Add Sale label"}
                      </button>
                      <button
                        onClick={() => deleteProduct(product)}
                        className="rounded-full border border-red-200 px-3 py-2 text-sm text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
          </div>
        </section>
      )}
      {tab === "orders" && (
        <section className="mt-5 grid gap-3">
          {!loading && (
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Find orders</h2>
                  <p className="mt-1 text-xs text-black/55">
                    Showing {filteredOrders.length} of {data.orders.length} orders
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={load}
                    disabled={loading}
                    className="rounded-full border border-black/15 px-3 py-2 text-sm transition hover:bg-black/5 disabled:cursor-wait disabled:opacity-50"
                  >
                    {loading ? "Refreshing..." : "Refresh orders"}
                  </button>
                  <button
                    type="button"
                    onClick={clearOrderFilters}
                    disabled={
                      !orderSearch &&
                      orderStatusFilter === "all" &&
                      orderActionFilter === "all"
                    }
                    className="rounded-full border border-black/15 px-3 py-2 text-sm transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-black/60">
                  Search orders
                  <input
                    type="search"
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Order, customer, product ID..."
                    className={field}
                  />
                </label>
                <label className="text-xs text-black/60">
                  Order status
                  <select
                    value={orderStatusFilter}
                    onChange={(event) => setOrderStatusFilter(event.target.value)}
                    className={field}
                  >
                    <option value="all">All statuses</option>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-black/60">
                  User action
                  <select
                    value={orderActionFilter}
                    onChange={(event) => setOrderActionFilter(event.target.value)}
                    className={field}
                  >
                    <option value="all">All actions</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </label>
              </div>
            </div>
          )}
          {loading ? (
            <AdminRowsSkeleton />
          ) : !data.orders.length ? (
            <p className="rounded-2xl bg-white/60 p-8 text-center text-sm text-black/55">
              No customer orders yet.
            </p>
          ) : filteredOrders.length ? (
            filteredOrders.map((order) => (
              <article
                key={order.orderNo}
                className="grid gap-3 rounded-2xl border border-black/10 bg-white/60 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{order.orderNo}</strong>
                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs">
                      {order.paymentMethod}
                    </span>
                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs">
                      Date: {formatOrderDate(order.createdAt)}
                    </span>
                    <span className="text-xs text-black/50">User action</span>
                    <UserActionBadge value={order.user_action} />
                  </div>
                  <p className="mt-1 text-sm">
                    {order.customerName} | {order.email} | {order.phone}
                  </p>
                  <p className="mt-1 text-xs text-black/55">
                    {order.items
                      .map(
                        (item) =>
                          item.qty +
                          " × " +
                          item.name +
                          (item.prescription
                            ? " [Right " +
                              Number(item.prescription.right).toFixed(2) +
                              " / Left " +
                              Number(item.prescription.left).toFixed(2) +
                              "]"
                            : ""),
                      )
                      .join(", ")}{" "}
                    | Total {formatCurrency(order.total)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-black/45">
                    {order.items.map((item, index) => (
                      <span key={index}>
                        {item.name}:{" "}
                        <code className="font-mono text-black/60">
                          {item.productId || "Missing"}
                        </code>
                      </span>
                    ))}
                  </div>
                </div>
                <label className="text-xs text-black/55">
                  Status
                  <select
                    value={order.status}
                    onChange={(event) =>
                      changeOrder(order.orderNo, event.target.value)
                    }
                    disabled={updatingOrderNo === order.orderNo}
                    className="mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-black"
                  >
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </article>
            ))
          ) : (
            <div className="rounded-2xl bg-white/60 p-8 text-center">
              <p className="text-sm text-black/55">
                No orders match these filters.
              </p>
              <button
                type="button"
                onClick={clearOrderFilters}
                className="mt-3 rounded-full border border-black/15 px-3 py-2 text-sm transition hover:bg-black/5"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
      )}
      {tab === "customers" && (
        <section className="mt-5 grid gap-3">
          {loading ? (
            <AdminRowsSkeleton />
          ) : (
            data.customers.map((customer) => (
              <article
                key={customer.id}
                className="flex flex-wrap justify-between gap-2 rounded-2xl border border-black/10 bg-white/60 p-4"
              >
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-black/55">{customer.email}</p>
                </div>
                <span className="text-xs uppercase text-black/50">
                  {customer.role}
                </span>
              </article>
            ))
          )}
        </section>
      )}
      {tab === "feedback" && <FeedbackAdminPanel />}
      {tab === "settings" &&
        (loading ? (
          <AdminRowsSkeleton count={2} />
        ) : (
          <form
            key={
              data.settings.updatedAt || data.settings.storeName || "settings"
            }
            onSubmit={saveSettings}
            className="mt-5 grid max-w-2xl gap-4 rounded-2xl border border-black/10 bg-white/60 p-5 sm:p-7"
          >
            {[
              ["storeName", "Store name"],
              ["announcement", "Announcement bar"],
              ["contactEmail", "Contact email"],
              ["phone", "Phone"],
              ["freeShippingThreshold", "Free shipping threshold (PKR)"],
              ["shopMaxPrice", "Shop maximum price (PKR)"],
            ].map(([key, label]) => (
              <label key={key} className="text-sm">
                {label}
                <input
                  name={key}
                  required
                  defaultValue={
                    data.settings[key] ??
                    (key === "shopMaxPrice"
                      ? 200
                      : key === "freeShippingThreshold"
                        ? 150
                        : "")
                  }
                  type={
                    ["freeShippingThreshold", "shopMaxPrice"].includes(key)
                      ? "number"
                      : "text"
                  }
                  min={
                    key === "shopMaxPrice"
                      ? 40
                      : key === "freeShippingThreshold"
                        ? 0
                        : undefined
                  }
                  max={key === "shopMaxPrice" ? 1000000 : undefined}
                  className={field}
                />
              </label>
            ))}
            <button className="w-fit rounded-full bg-black px-6 py-3 text-sm text-white">
              Save settings
            </button>
          </form>
        ))}
      {editing && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-3 sm:p-6">
          <form
            onSubmit={saveProduct}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#f6f3ed] p-5 sm:p-7"
          >
            <div className="mb-5 flex justify-between">
              <div>
                <h2 className="font-space text-2xl">
                  {editing.id ? "Edit product" : "Add product"}
                </h2>
                {editing.id && (
                  <p className="text-xs text-black/50">{editing.id}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["name", "Name", "text"],
                ["price", "Price (PKR)", "number"],
                ["salePrice", "Sale price (PKR)", "number"],
                ["stock", "Stock", "number"],
              ].map(([key, label, type]) => (
                <label key={key} className="text-sm">
                  {label}
                  <input
                    type={type}
                    min={type === "number" ? 0 : undefined}
                    required={["name", "price", "stock"].includes(key)}
                    value={editing[key] ?? ""}
                    onChange={(event) =>
                      setEditing({ ...editing, [key]: event.target.value })
                    }
                    className={field}
                  />
                </label>
              ))}
              <label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-black/10 bg-white/50 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={editing.saleLabel === true}
                  onChange={(event) =>
                    setEditing({ ...editing, saleLabel: event.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 accent-red-700"
                />
                <span>
                  <span className="block font-medium">Show Sale label</span>
                  <span className="block text-xs text-black/55">
                    Displays a Sale badge. A sale price also shows the badge
                    automatically.
                  </span>
                </span>
              </label>
              <ProductImageUpload
                key={editing.id || "new-product"}
                image={editing.image || ""}
                imageFileId={editing.imageFileId || ""}
                imageEnhanced={editing.imageEnhanced}
                onUploadingChange={setImageUploading}
                onUploaded={(uploaded) =>
                  setEditing((current) =>
                    current ? { ...current, ...uploaded } : current,
                  )
                }
              />
              <ProductTryOnImageUpload
                key={(editing.id || "new-product") + "-try-on"}
                tryOnImage={editing.tryOnImage || ""}
                onUploadingChange={setImageUploading}
                onUploaded={(uploaded) =>
                  setEditing((current) =>
                    current ? { ...current, ...uploaded } : current,
                  )
                }
              />
              <div className="sm:col-span-2 rounded-xl border border-black/10 bg-white/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      Available frame colors
                    </p>
                    <p className="text-xs text-black/55">
                      Choose the colors customers can select.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={(editing.colors || []).length >= 8}
                    onClick={() =>
                      setEditing((current) =>
                        current && (current.colors || []).length < 8
                          ? {
                              ...current,
                              colors: [
                                ...(current.colors || []),
                                { name: "", swatch: "#171717" },
                              ],
                            }
                          : current,
                      )
                    }
                    className="rounded-full border border-black/20 px-3 py-2 text-xs disabled:opacity-40"
                  >
                    Add color
                  </button>
                </div>
                {(editing.colors || []).map((entry, index) => (
                  <div
                    key={"color-" + index}
                    className="mt-3 grid grid-cols-[minmax(0,1fr)_70px_38px] items-end gap-2"
                  >
                    <label className="text-xs">
                      Color name
                      <input
                        required
                        maxLength={40}
                        value={entry.name || ""}
                        onChange={(event) => {
                          const name = event.target.value;
                          setEditing((current) =>
                            current
                              ? {
                                  ...current,
                                  colors: (current.colors || []).map(
                                    (value, position) =>
                                      position === index
                                        ? { ...value, name }
                                        : value,
                                  ),
                                }
                              : current,
                          );
                        }}
                        className={field}
                      />
                    </label>
                    <label className="text-xs">
                      Swatch
                      <input
                        aria-label={"Swatch for " + (entry.name || "new color")}
                        type="color"
                        value={
                          /^#[0-9a-fA-F]{6}$/.test(entry.swatch || "")
                            ? entry.swatch
                            : "#171717"
                        }
                        onChange={(event) => {
                          const swatch = event.target.value;
                          setEditing((current) =>
                            current
                              ? {
                                  ...current,
                                  colors: (current.colors || []).map(
                                    (value, position) =>
                                      position === index
                                        ? { ...value, swatch }
                                        : value,
                                  ),
                                }
                              : current,
                          );
                        }}
                        className="mt-1 h-11 w-full cursor-pointer rounded-xl border border-black/15 bg-white p-1"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={(editing.colors || []).length <= 1}
                      onClick={() =>
                        setEditing((current) =>
                          current
                            ? {
                                ...current,
                                colors: (current.colors || []).filter(
                                  (_, position) => position !== index,
                                ),
                              }
                            : current,
                        )
                      }
                      aria-label={"Remove " + (entry.name || "color")}
                      className="mb-1 grid h-9 w-9 place-items-center rounded-full border border-black/15 text-lg disabled:opacity-35"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {[
                ["category", "Category", CATEGORIES],
                ["shape", "Shape", ["Round", "Square", "Aviator", "Cat-eye"]],
                ["material", "Material", ["Acetate", "Metal"]],
                ["gender", "Gender", ["Women", "Men", "All"]],
              ].map(([key, label, options]) => (
                <label key={key} className="text-sm">
                  {label}
                  <select
                    required={key === "gender"}
                    value={
                      options.includes(editing[key])
                        ? editing[key]
                        : key === "gender"
                          ? ""
                          : options[0]
                    }
                    onChange={(event) =>
                      setEditing({ ...editing, [key]: event.target.value })
                    }
                    className={field}
                  >
                    {key === "gender" && (
                      <option value="" disabled>
                        Select Men, Women, or All
                      </option>
                    )}
                    {options.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  {key === "gender" &&
                    editing.gender &&
                    !["Women", "Men", "All"].includes(editing.gender) && (
                      <span className="mt-1 block text-xs text-black/55">
                        Choose Men, Women, or All before saving this existing
                        product.
                      </span>
                    )}
                </label>
              ))}
              <label className="text-sm sm:col-span-2">
                Description
                <textarea
                  rows="3"
                  value={editing.description || ""}
                  onChange={(event) =>
                    setEditing({ ...editing, description: event.target.value })
                  }
                  className={field + " h-auto py-2"}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full border px-5 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                disabled={busy || imageUploading}
                className="rounded-full bg-black px-5 py-2.5 text-sm text-white"
              >
                {imageUploading
                  ? "Enhancing and uploading image..."
                  : busy
                    ? "Saving..."
                    : "Save product"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
