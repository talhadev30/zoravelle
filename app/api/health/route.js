import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await connectDB();
    await mongoose.connection.db.admin().ping();
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers });
  }
}