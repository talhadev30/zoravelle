import { connectDB } from "@/lib/db";
import { Newsletter } from "@/lib/models";

export async function POST(request) {
  try {
    const { email: rawEmail } = await request.json();
    const email = String(rawEmail || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    await connectDB();
    await Newsletter.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
    return Response.json({ ok: true, message: "Thanks for joining." });
  } catch { return Response.json({ error: "Newsletter is unavailable right now." }, { status: 503 }); }
}
