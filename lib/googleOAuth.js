import "server-only";

export function getGoogleRedirectUri(requestUrl) {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!configured && process.env.NODE_ENV === "production") return "";
  try {
    const callback = new URL(configured || new URL("/api/auth/google/callback", requestUrl).toString());
    if (
      callback.pathname !== "/api/auth/google/callback" ||
      callback.username || callback.password || callback.search || callback.hash ||
      !["http:", "https:"].includes(callback.protocol) ||
      (process.env.NODE_ENV === "production" && callback.protocol !== "https:")
    ) return "";
    return callback.toString();
  } catch {
    return "";
  }
}