import { connectDB } from "@/lib/db";
import { Order, Product, StoreSettings, User } from "@/lib/models";
import { requireAdmin } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/security";
import mongoose from "mongoose";

const denied = () => Response.json({ error: "Admin access required." }, { status: 401 });

export async function GET() {
  if (!(await requireAdmin())) return denied();
  try {
    await connectDB();
    const [orders, customers, settings] = await Promise.all([
      Order.find({}).sort({ createdAt: -1 }).limit(300).lean(),
      User.find({}).select("name email role createdAt").sort({ createdAt: -1 }).limit(300).lean(),
      StoreSettings.findById("store").lean(),
    ]);
    return Response.json({
      orders: orders.map((order) => ({
        ...order,
        id: order.orderNo,
        user_action: ["pending", "confirmed", "canceled"].includes(order.user_action)
          ? order.user_action
          : "pending",
        _id: undefined,
      })),
      customers: customers.map((user) => ({ id: String(user._id), name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })),
      settings: settings || { storeName: "Zoravelle", announcement: "", contactEmail: "", phone: "", freeShippingThreshold: 150, shopMaxPrice: 200 },
    });
  } catch { return Response.json({ error: "Admin data is unavailable." }, { status: 503 }); }
}
export async function PATCH(request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  if (!(await requireAdmin())) return denied();
  try {
    await connectDB();
    const body = await request.json();
    if (body.type === "order") {
      if (Object.hasOwn(body, "user_action")) {
        return Response.json({ error: "User action is read-only." }, { status: 400 });
      }
      const allowed = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
      if (!allowed.includes(body.status)) return Response.json({ error: "Invalid order status." }, { status: 400 });
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const order = await Order.findOne({ orderNo: body.orderNo }).session(session);
          if (!order) {
            const error = new Error("Order not found.");
            error.status = 404;
            throw error;
          }
          if (order.status === body.status) return;
          const transitions = {
            Pending: ["Processing", "Shipped", "Cancelled"],
            Processing: ["Pending", "Shipped", "Cancelled"],
            Shipped: ["Delivered"],
            Delivered: [],
            Cancelled: ["Pending"],
          };
          if (!transitions[order.status]?.includes(body.status)) {
            const error = new Error("This order status change is not allowed.");
            error.status = 409;
            throw error;
          }
          if (order.status === "Cancelled" && body.status === "Pending") {
            for (const item of order.items) {
              const result = await Product.updateOne(
                { id: item.productId, stock: { $gte: item.qty } },
                { $inc: { stock: -item.qty } },
                { session },
              );
              if (!result.modifiedCount) {
                const error = new Error("Not enough stock to reopen this order.");
                error.status = 409;
                throw error;
              }
            }
          }
          if (body.status === "Cancelled") {
            for (const item of order.items) {
              await Product.updateOne(
                { id: item.productId },
                { $inc: { stock: item.qty } },
                { session },
              );
            }
          }
          order.status = body.status;
          await order.save({ session });
        });
        return Response.json({ ok: true });
      } catch (error) {
        if (error?.status === 404 || error?.status === 409) {
          return Response.json({ error: error.message }, { status: error.status });
        }
        throw error;
      } finally {
        await session.endSession();
      }
    }
    if (body.type === "settings") {
      const input = body.settings || {};
      const clean = {
        storeName: String(input.storeName || "").trim().slice(0, 80),
        announcement: String(input.announcement || "").trim().slice(0, 180),
        contactEmail: String(input.contactEmail || "").trim().slice(0, 254),
        phone: String(input.phone || "").trim().slice(0, 40),
        freeShippingThreshold: Number(input.freeShippingThreshold), shopMaxPrice: Number(input.shopMaxPrice),
      };
      if (!clean.storeName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.contactEmail) || !Number.isFinite(clean.freeShippingThreshold) || clean.freeShippingThreshold < 0 || !Number.isInteger(clean.shopMaxPrice) || clean.shopMaxPrice < 40 || clean.shopMaxPrice > 1000000) return Response.json({ error: "Check your store settings." }, { status: 400 });
      await StoreSettings.findByIdAndUpdate("store", clean, { upsert: true, new: true, runValidators: true });
      return Response.json({ ok: true, settings: clean });
    }
    return Response.json({ error: "Unknown admin update." }, { status: 400 });
  } catch { return Response.json({ error: "Could not save admin changes." }, { status: 503 }); }
}
