import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { isSameOriginRequest } from "@/lib/security";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Order, Product, StoreSettings } from "@/lib/models";
import {
  COATING_OPTIONS,
  FREE_SHIPPING_THRESHOLD,
  LENS_OPTIONS,
} from "@/lib/storefront";
import { sendOrderAdminEmail } from "@/lib/order-email";

export const runtime = "nodejs";

const lensPrices = Object.fromEntries(
  LENS_OPTIONS.map((item) => [item.id, item.price]),
);
function validPrescriptionSphere(value) {
  if (value === "" || value === null || value === undefined) return false;
  const number = Number(value);
  return Number.isFinite(number) &&
    number >= -20 &&
    number <= 20 &&
    Math.abs(number * 4 - Math.round(number * 4)) < 0.0001;
}
const coatingPrices = Object.fromEntries(
  COATING_OPTIONS.map((item) => [item.id, item.price]),
);

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { error: "Please log in to view orders." },
      { status: 401 },
    );
  try {
    await connectDB();
    const orders = await Order.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .lean();
    return Response.json(orders.map((order) => ({ ...order, _id: undefined })));
  } catch {
    return Response.json({ error: "Orders are unavailable." }, { status: 503 });
  }
}
export async function POST(request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { error: "Please log in before checkout." },
      { status: 401 },
    );

  try {
    await connectDB();
    const body = await request.json();
    const customerName = String(body.customerName || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim();
    const city = String(body.city || "").trim();
    if (
      !customerName ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !phone ||
      !address ||
      !city
    )
      return Response.json(
        { error: "Complete all delivery details." },
        { status: 400 },
      );
    if (
      !Array.isArray(body.items) ||
      !body.items.length ||
      body.items.length > 30
    )
      return Response.json({ error: "Your bag is empty." }, { status: 400 });
    const ids = [
      ...new Set(body.items.map((item) => String(item.productId || ""))),
    ];
    const products = await Product.find({ id: { $in: ids } }).lean();
    const byId = new Map(products.map((product) => [product.id, product]));
    const items = [];
    for (const item of body.items) {
      const product = byId.get(String(item.productId));
      const qty = Number(item.qty);
      if (!product || !Number.isInteger(qty) || qty < 1 || qty > 10)
        return Response.json(
          { error: "One of your items is no longer available." },
          { status: 409 },
        );
      const color = String(item.color || "");
      if (!product.colors.some((entry) => entry.name === color))
        return Response.json(
          { error: "Choose a valid frame color." },
          { status: 400 },
        );
      const purpose = Object.hasOwn(lensPrices, item.purpose)
        ? item.purpose
        : "frame";
      const coatings = Array.isArray(item.coatings)
        ? [
            ...new Set(
              item.coatings.filter((id) => Object.hasOwn(coatingPrices, id)),
            ),
          ]
        : [];
      const requiresPrescription = product.category === "Eyeglasses" && ["rx", "prog"].includes(purpose);
      let prescription;
      if (requiresPrescription) {
        const right = item.prescription?.right;
        const left = item.prescription?.left;
        if (!validPrescriptionSphere(right) || !validPrescriptionSphere(left)) {
          return Response.json(
            { error: "Enter valid right and left eye numbers from -20.00 to +20.00 in 0.25 steps." },
            { status: 400 },
          );
        }
        prescription = { right: Number(right), left: Number(left) };
      }
      const unitPrice =
        (product.salePrice ?? product.price) +
        lensPrices[purpose] +
        coatings.reduce((sum, id) => sum + coatingPrices[id], 0);
      items.push({
        productId: product.id,
        name: product.name,
        image: product.image,
        color,
        purpose,
        coatings,
        prescription,
        qty,
        unitPrice,
      });
    }
    const subtotal = items.reduce(
      (sum, item) => sum + item.unitPrice * item.qty,
      0,
    );
    const discount = 0;
    const storeSettings = await StoreSettings.findById("store").lean();
    const threshold = Number(
      storeSettings?.freeShippingThreshold ?? FREE_SHIPPING_THRESHOLD,
    );
    const shipping = subtotal >= threshold ? 0 : 10;
    const orderNo = "ZR-" + randomBytes(8).toString("hex").toUpperCase();
    const session = await mongoose.startSession();
    let order;
    try {
      await session.withTransaction(async () => {
        for (const item of items) {
          const result = await Product.updateOne(
            { id: item.productId, stock: { $gte: item.qty } },
            { $inc: { stock: -item.qty } },
            { session },
          );
          if (!result.modifiedCount) {
            const error = new Error(item.name + " no longer has enough stock.");
            error.status = 409;
            throw error;
          }
        }
        const created = await Order.create(
          [{
            orderNo,
            userId: user.id,
            customerName,
            email,
            phone,
            address,
            city,
            postalCode: String(body.postalCode || "").trim().slice(0, 20),
            items,
            subtotal,
            discount,
            shipping,
            total: subtotal - discount + shipping,
            paymentMethod: "Cash on delivery",
            status: "Pending",
          }],
          { session },
        );
        order = created[0];
      });
    } finally {
      await session.endSession();
    }
    await sendOrderAdminEmail(order);
    return Response.json({ ok: true, orderNo: order.orderNo }, { status: 201 });
  } catch (error) {
    if (error?.status === 409) return Response.json({ error: error.message }, { status: 409 });
    return Response.json(
      { error: "Could not place your order. Please try again." },
      { status: 503 },
    );
  }
}
