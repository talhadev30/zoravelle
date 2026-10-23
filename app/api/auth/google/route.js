import { randomBytes } from "node:crypto";
import { getGoogleRedirectUri } from "@/lib/googleOAuth";
import { NextResponse } from "next/server";
const STATE_COOKIE = "zv_google_state",
  NEXT_COOKIE = "zv_google_next";
export async function GET(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const callback = getGoogleRedirectUri(request.url);
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET || !callback)
    return NextResponse.redirect(
      new URL("/login?error=google-config", request.url),
    );
  const state = randomBytes(32).toString("hex");
  const requestedNext =
    new URL(request.url).searchParams.get("next") || "/account";
  const next =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.includes("\\")
      ? requestedNext
      : "/account";
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", clientId);
  authorization.searchParams.set("redirect_uri", callback);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "openid email profile");
  authorization.searchParams.set("state", state);
  authorization.searchParams.set("prompt", "select_account");
  const response = NextResponse.redirect(authorization);
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  };
  response.cookies.set(STATE_COOKIE, state, options);
  response.cookies.set(NEXT_COOKIE, next, options);
  return response;
}
