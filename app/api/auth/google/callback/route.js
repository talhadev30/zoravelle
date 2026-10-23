import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/welcome-email";
import { User } from "@/lib/models";
import { getGoogleRedirectUri } from "@/lib/googleOAuth";
export const runtime = "nodejs";
const STATE_COOKIE = "zv_google_state", NEXT_COOKIE = "zv_google_next";
function sameState(left, right) { if (!left || !right) return false; const a = Buffer.from(left), b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }
function failure(request) { const response = NextResponse.redirect(new URL("/login?error=google", request.url)); response.cookies.delete(STATE_COOKIE); response.cookies.delete(NEXT_COOKIE); return response; }
function googleAvatar(value) {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || (host !== "googleusercontent.com" && !host.endsWith(".googleusercontent.com"))) return "";
    return url.toString().slice(0, 2048);
  } catch {
    return "";
  }
}
export async function GET(request) {
  const url = new URL(request.url), code = url.searchParams.get("code"), state = url.searchParams.get("state"), jar = await cookies();
  if (url.searchParams.has("error") || !code || !sameState(state, jar.get(STATE_COOKIE)?.value)) return failure(request);
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID, clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = getGoogleRedirectUri(request.url);
    if (!clientId || !clientSecret || !redirectUri) return failure(request);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }), cache: "no-store" });
    if (!tokenResponse.ok) return failure(request);
    const token = await tokenResponse.json(); if (!token.access_token) return failure(request);
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: "Bearer " + token.access_token }, cache: "no-store" });
    if (!profileResponse.ok) return failure(request);
    const profile = await profileResponse.json(); if (!profile.sub || !profile.email || profile.email_verified !== true) return failure(request); const avatarUrl = googleAvatar(profile.picture);
    await connectDB(); const email = String(profile.email).trim().toLowerCase();
    let user = await User.findOne({ googleId: profile.sub });
    let isNewUser = false;
    if (!user) {
      user = await User.findOne({ email });
      if (user?.googleId && user.googleId !== profile.sub) return failure(request);
      if (user) { user.googleId = profile.sub; if (!user.name) user.name = String(profile.name || email).slice(0, 80); if (avatarUrl) user.avatarUrl = avatarUrl; await user.save(); }
      else {
        user = await User.create({ name: String(profile.name || email).slice(0, 80), email, googleId: profile.sub, avatarUrl, role: "customer" });
        isNewUser = true;
      }
    }
    if (avatarUrl && user.avatarUrl !== avatarUrl) { user.avatarUrl = avatarUrl; await user.save(); }
    await startSession(user);
    if (isNewUser) await sendWelcomeEmail(user);
    const requestedNext = jar.get(NEXT_COOKIE)?.value || "/account";
    const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\") ? requestedNext : "/account";
    const missingContactDetails = !user.phone?.trim() || !user.address?.trim() || !user.city?.trim();
    const destination = missingContactDetails
      ? `/profile?complete=1&next=${encodeURIComponent(next)}`
      : next;
    const response = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(NEXT_COOKIE);
    return response;
  } catch (error) { console.error("[auth]: Google sign-in failed", error?.name || "Error"); return failure(request); }
}
