import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { getCurrentUser, hashPassword, publicUser, SESSION_COOKIE, startSession, verifyPassword } from "@/lib/auth";
import { Session, User } from "@/lib/models";
import { isSameOriginRequest } from "@/lib/security";

export const runtime = "nodejs";

const reply = (body, status) => Response.json(body, { status: status || 200 });
const cleanEmail = (value) => String(value || "").trim().toLowerCase();

export async function GET(_request, context) {
  const { action } = await context.params;
  if (action !== "me") return reply({ error: "Not found." }, 404);
  try { return reply({ user: await getCurrentUser() }); }
  catch { return reply({ error: "Account service is unavailable." }, 503); }
}

export async function POST(request, context) {
  if (!isSameOriginRequest(request)) return reply({ error: "This request is not allowed." }, 403);
  const { action } = await context.params;
  try {
    await connectDB();
    if (action === "logout") {
      const jar = await cookies();
      const token = jar.get(SESSION_COOKIE)?.value;
      if (token) await Session.deleteOne({ tokenHash: createHash("sha256").update(token).digest("hex") });
      jar.delete(SESSION_COOKIE);
      return reply({ ok: true });
    }
    const body = await request.json();
    const email = cleanEmail(body.email);
    const password = String(body.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return reply({ error: "Enter a valid email address." }, 400);
    if (password.length < 8 || password.length > 128) return reply({ error: "Password must be between 8 and 128 characters." }, 400);
    if (action === "register") {
      const name = String(body.name || "").trim();
      if (name.length < 2 || name.length > 80) return reply({ error: "Enter your name." }, 400);
      const phone = String(body.phone || "").trim();
      const address = String(body.address || "").trim();
      const city = String(body.city || "").trim();
      if (phone.length > 40 || address.length > 180 || city.length > 80) {
        return reply({ error: "Phone, address, or city is too long." }, 400);
      }
      if (await User.exists({ email })) return reply({ error: "An account with this email already exists." }, 409);
      const user = await User.create({ name, email, phone, address, city, passwordHash: await hashPassword(password), role: "customer" });
      await startSession(user);
      return reply({ user: publicUser(user), ok: true }, 201);
    }
    if (action === "login") {
      const user = await User.findOne({ email });
      if (!user || !(await verifyPassword(password, user.passwordHash))) return reply({ error: "Email or password is incorrect." }, 401);
      await startSession(user);
      return reply({ user: publicUser(user), ok: true });
    }
    return reply({ error: "Not found." }, 404);
  } catch (error) {
    if (error?.code === 11000) return reply({ error: "An account with this email already exists." }, 409);
    return reply({ error: "Account service is unavailable." }, 503);
  }
}
