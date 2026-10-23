export const CATEGORIES = ["Eyeglasses", "Sunglasses", "Blue-light", "Kids"];
export const LENS_OPTIONS = [
  { id: "frame", label: "Frame only", price: 0 },
  { id: "plain", label: "Non-prescription", price: 0 },
  { id: "rx", label: "Prescription · single vision", price: 30 },
  { id: "prog", label: "Prescription · progressive", price: 120 },
];
export const COATING_OPTIONS = [
  { id: "blue", label: "Blue-cut", price: 25 },
  { id: "ar", label: "Anti-glare", price: 15 },
  { id: "photo", label: "Photochromic", price: 60 },
];
export const FREE_SHIPPING_THRESHOLD = 150;
export const CART_KEY = "zv-cart";
export const WISHLIST_KEY = "zv-wish";

export function productPrice(product) {
  return product?.salePrice ?? product?.price ?? 0;
}

export function itemUnitPrice(item, products = []) {
  const product = products.find((entry) => entry.id === item.productId);
  const lens = LENS_OPTIONS.find((entry) => entry.id === item.purpose)?.price ?? 0;
  const coat = (item.coatings || []).reduce((sum, id) => sum + (COATING_OPTIONS.find((entry) => entry.id === id)?.price ?? 0), 0);
  return productPrice(product) + lens + coat;
}

const currencyFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  currencyDisplay: "code",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(value) {
  const amount = Number(value);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}