import "server-only";
import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Session, User } from "@/lib/models";

const scrypt = promisify(nodeScrypt);
export const SESSION_COOKIE = "zv_session";

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return salt + ":" + Buffer.from(key).toString("hex");
}
export async function verifyPassword(password, stored) {
  const parts = String(stored || "").split(":");
  if (!parts[0] || !parts[1]) return false;
  const actual = Buffer.from(await scrypt(password, parts[0], 64));
  const expected = Buffer.from(parts[1], "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function publicUser(user) {
  return user ? { id: String(user._id), name: user.name, email: user.email, phone: user.phone || "", address: user.address || "", city: user.city || "", postalCode: user.postalCode || "", avatarUrl: user.avatarUrl || "", role: user.role } : null;
}
export async function startSession(user) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await Session.create({ tokenHash: createHash("sha256").update(token).digest("hex"), userId: user._id, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}
export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await connectDB();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = await Session.findOne({ tokenHash, expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;
  return publicUser(await User.findById(session.userId).select("name email role phone address city postalCode avatarUrl").lean());
}
export async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}
