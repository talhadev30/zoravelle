import { cache } from "react";
import { dbConnect } from "@/lib/db";
import { Product, StoreSettings } from "@/lib/models";

const publicProductFields =
  "id name category shape material gender price salePrice saleLabel image tryOnImage colors stock rating reviews measurements description";

function toPublicProduct(product) {
  return {
    id: String(product.id || product._id),
    name: String(product.name || ""),
    category: String(product.category || ""),
    shape: String(product.shape || ""),
    material: String(product.material || ""),
    gender: String(product.gender || ""),
    price: Number(product.price || 0),
    salePrice: product.salePrice == null ? null : Number(product.salePrice),
    saleLabel: product.saleLabel === true,
    image: String(product.image || ""),
    tryOnImage: String(product.tryOnImage || ""),
    colors: Array.isArray(product.colors)
      ? product.colors.map((color) => ({
          name: String(color.name || ""),
          swatch: String(color.swatch || ""),
        }))
      : [],
    stock: Number(product.stock || 0),
    rating: Number(product.rating || 0),
    reviews: Number(product.reviews || 0),
    measurements: {
      lens: product.measurements?.lens ?? null,
      bridge: product.measurements?.bridge ?? null,
      temple: product.measurements?.temple ?? null,
    },
    description: String(product.description || ""),
  };
}

export const getStoreProducts = cache(async function getStoreProducts() {
  try {
    await dbConnect();
    const products = await Product.find({})
      .select(publicProductFields)
      .sort({ createdAt: -1 })
      .lean();
    return products.map(toPublicProduct);
  } catch {
    return [];
  }
});

export const getFeaturedProducts = cache(async function getFeaturedProducts() {
  try {
    await dbConnect();
    const products = await Product.find({})
      .select(publicProductFields)
      .sort({ saleLabel: -1, createdAt: -1 })
      .limit(4)
      .lean();
    return products.map(toPublicProduct);
  } catch {
    return [];
  }
});

export const getStoreProduct = cache(async function getStoreProduct(id) {
  await dbConnect();
  const product = await Product.findOne({ id }).select(publicProductFields).lean();
  return product ? toPublicProduct(product) : null;
});

export const getRelatedProducts = cache(async function getRelatedProducts(id, category) {
  try {
    await dbConnect();
    const products = await Product.find({ id: { $ne: id }, category })
      .select(publicProductFields)
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();
    return products.map(toPublicProduct);
  } catch {
    return [];
  }
});

export const getShopMaxPrice = cache(async function getShopMaxPrice() {
  try {
    await dbConnect();
    const settings = await StoreSettings.findById("store")
      .select("shopMaxPrice")
      .lean();
    return Math.max(40, Number(settings?.shopMaxPrice) || 200);
  } catch {
    return 200;
  }
});

export const getStoreSettings = cache(async function getStoreSettings() {
  try {
    await dbConnect();
    const settings = await StoreSettings.findById("store").lean();
    return settings
      ? {
          storeName: String(settings.storeName || "Zoravelle"),
          contactEmail: String(settings.contactEmail || ""),
          phone: String(settings.phone || ""),
          announcement: String(settings.announcement || ""),
          freeShippingThreshold: Number(settings.freeShippingThreshold || 150),
          shopMaxPrice: Math.max(40, Number(settings.shopMaxPrice) || 200),
        }
      : null;
  } catch {
    return null;
  }
});

export async function getProductSitemapEntries() {
  await dbConnect();
  return Product.find({})
    .select("id updatedAt")
    .sort({ updatedAt: -1 })
    .lean();
}
