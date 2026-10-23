import { dbConnect } from "@/lib/db";
import { Product } from "@/lib/models";
import { requireAdmin } from "@/lib/auth";
import { getImageKitUrlEndpoint, isImageKitUrl } from "@/services/imagekit.service";
import { isSameOriginRequest } from "@/lib/security";

const categories = ["Eyeglasses", "Sunglasses", "Blue-light", "Kids"];
const genders = ["Women", "Men", "All"];
const serialize = (product) => ({ ...product, id: String(product.id || product._id), _id: undefined, __v: undefined });
const unavailable = () => Response.json({ error: "Product service is unavailable." }, { status: 503 });

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalize(body, { allowLegacyImage = false } = {}) {
  const name = String(body.name || "").trim();
  const id = body.id ? String(body.id).trim().slice(0, 80) : slugify(name);
  const price = Number(body.price);
  const stock = Number(body.stock);
  const image = String(body.image || "").trim();
  const imageFileId = String(body.imageFileId || "").trim();
  const tryOnImage = String(body.tryOnImage || "").trim();
  if (tryOnImage.length > 1000) throw new Error("Try-on image URL is too long.");
  if (tryOnImage) {
    const endpoint = getImageKitUrlEndpoint();
    if (!isImageKitUrl(tryOnImage, endpoint)) throw new Error("Try-on image URL must belong to ImageKit.");
  }
  if (imageFileId.length > 200) throw new Error("ImageKit file ID is too long.");
  if (!imageFileId && !allowLegacyImage) throw new Error("Upload a product image to ImageKit before saving.");
  if (!allowLegacyImage || imageFileId) {
    const endpoint = getImageKitUrlEndpoint();
    if (!isImageKitUrl(image, endpoint)) throw new Error("Product image URL must belong to ImageKit.");
  }
  if (!name || name.length > 120 || !id || !image || image.length > 1000 || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) throw new Error("Enter a name, image path, valid price, and non-negative stock.");
  if (!categories.includes(body.category)) throw new Error("Choose a valid category.");
  const gender = String(body.gender || "");
  if (!genders.includes(gender)) throw new Error("Choose Men, Women, or All for gender.");
  const submittedColors = body.colors === undefined ? [{ name: "Onyx", swatch: "#171717" }] : body.colors;
  if (!Array.isArray(submittedColors) || submittedColors.length < 1 || submittedColors.length > 8) {
    throw new Error("Add at least one available frame color.");
  }
  const colors = submittedColors.map((entry) => ({
    name: String(entry?.name || "").trim(),
    swatch: String(entry?.swatch || "").trim(),
  }));
  const colorNames = new Set();
  for (const color of colors) {
    const normalizedName = color.name.toLowerCase();
    if (!color.name || color.name.length > 40 || !/^#[0-9a-fA-F]{6}$/.test(color.swatch)) {
      throw new Error("Use a valid color name and six-digit hex swatch.");
    }
    if (colorNames.has(normalizedName)) throw new Error("Use a unique color name for each frame color.");
    colorNames.add(normalizedName);
  }
  const salePrice = body.salePrice === "" || body.salePrice == null ? undefined : Number(body.salePrice);
  if (salePrice !== undefined && (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice > price)) throw new Error("Sale price must be lower than regular price.");
  return {
    id, name, category: body.category, shape: String(body.shape || "Round"),
    material: String(body.material || "Acetate"), gender,
    price, salePrice, saleLabel: body.saleLabel === true, image, imageFileId, imageEnhanced: body.imageEnhanced === true, tryOnImage,
    colors,
    stock, rating: Number(body.rating) || 0, reviews: Number(body.reviews) || 0,
    measurements: body.measurements || { lens: 50, bridge: 20, temple: 145 },
    description: String(body.description || "").slice(0, 2000),
  };
}
export async function GET() {
  try {
    await dbConnect();
    const products = await Product.find({}).sort({ createdAt: 1 }).lean();
    return Response.json(products.map(serialize));
  } catch (error) {
    console.error("[products] GET failed:", error);
    return unavailable();
  }
}
export async function POST(request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  if (!(await requireAdmin())) return Response.json({ error: "Admin access required." }, { status: 401 });
  try {
    await dbConnect();
    const body = await request.json();
    const id = slugify(body.name);
    const product = await Product.create(normalize({ ...body, id }));
    return Response.json(serialize(product.toObject()), { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return Response.json({ error: "That product URL already exists." }, { status: 409 });
    if (error?.code === "ENV_CONFIG") return Response.json({ error: "ImageKit URL endpoint is not configured." }, { status: 500 });
    const invalid = ["Enter a name, image path, valid price, and non-negative stock.", "Choose a valid category.", "Choose Men, Women, or All for gender.", "Sale price must be lower than regular price.", "Upload a product image to ImageKit before saving.", "Product image URL must belong to ImageKit.", "ImageKit file ID is too long.", "Try-on image URL is too long.", "Try-on image URL must belong to ImageKit.", "Add at least one available frame color.", "Use a unique color name for each frame color.", "Use a valid color name and six-digit hex swatch."].includes(error.message);
    return Response.json({ error: invalid ? error.message : "Product service is unavailable." }, { status: invalid ? 400 : 503 });
  }
}
export async function PUT(request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  if (!(await requireAdmin())) return Response.json({ error: "Admin access required." }, { status: 401 });
  try {
    await dbConnect();
    const body = await request.json();
    const id = new URL(request.url).searchParams.get("id");
    const existing = await Product.findOne({ id }).lean();
    if (!existing) return Response.json({ error: "Product not found." }, { status: 404 });
    const allowLegacyImage = String(body.image || "").trim() === existing.image && !body.imageFileId;
    const product = await Product.findOneAndUpdate(
      { id },
      normalize({ ...body, id }, { allowLegacyImage }),
      { new: true, runValidators: true },
    ).lean();
    return product ? Response.json(serialize(product)) : Response.json({ error: "Product not found." }, { status: 404 });
  } catch (error) {
    if (error?.code === 11000) return Response.json({ error: "That product URL already exists." }, { status: 409 });
    if (error?.code === "ENV_CONFIG") return Response.json({ error: "ImageKit URL endpoint is not configured." }, { status: 500 });
    const invalid = ["Enter a name, image path, valid price, and non-negative stock.", "Choose a valid category.", "Choose Men, Women, or All for gender.", "Sale price must be lower than regular price.", "Upload a product image to ImageKit before saving.", "Product image URL must belong to ImageKit.", "ImageKit file ID is too long.", "Try-on image URL is too long.", "Try-on image URL must belong to ImageKit.", "Add at least one available frame color.", "Use a unique color name for each frame color.", "Use a valid color name and six-digit hex swatch."].includes(error.message);
    return Response.json({ error: invalid ? error.message : "Product service is unavailable." }, { status: invalid ? 400 : 503 });
  }
}
export async function PATCH(request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  if (!(await requireAdmin())) return Response.json({ error: "Admin access required." }, { status: 401 });
  try {
    await dbConnect();
    const body = await request.json();
    if (typeof body?.saleLabel !== "boolean") return Response.json({ error: "Choose whether to show the Sale label." }, { status: 400 });
    const id = new URL(request.url).searchParams.get("id");
    const product = await Product.findOneAndUpdate(
      { id },
      { $set: { saleLabel: body.saleLabel } },
      { new: true, runValidators: true },
    ).lean();
    return product ? Response.json(serialize(product)) : Response.json({ error: "Product not found." }, { status: 404 });
  } catch {
    return unavailable();
  }
}

export async function DELETE(request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  if (!(await requireAdmin())) return Response.json({ error: "Admin access required." }, { status: 401 });
  try {
    await dbConnect();
    const id = new URL(request.url).searchParams.get("id");
    const result = await Product.deleteOne({ id });
    return result.deletedCount ? Response.json({ ok: true }) : Response.json({ error: "Product not found." }, { status: 404 });
  } catch { return unavailable(); }
}
