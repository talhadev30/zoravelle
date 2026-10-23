import "server-only";
import { getResendClient } from "@/lib/resend-client";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function welcomeHtml(name) {
  const safeName = escapeHtml(name);
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Welcome to Zoravelle</title></head>' +
    '<body style="margin:0;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;color:#171717"><div style="display:none;max-height:0;overflow:hidden;opacity:0">Your Zoravelle account is ready. Find frames made for your everyday.</div>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2ee;padding:36px 16px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden">' +
    '<tr><td style="padding:32px 36px 18px;text-align:center"><div style="font-size:13px;letter-spacing:4px;font-weight:700">ZORAVELLE</div></td></tr>' +
    '<tr><td style="padding:28px 36px 42px"><p style="margin:0 0 12px;color:#777;font-size:12px;letter-spacing:2px;text-transform:uppercase">A clearer view starts here</p><h1 style="margin:0 0 20px;font-size:32px;line-height:1.2;letter-spacing:-1px">Welcome, ' + safeName + '.</h1>' +
    '<p style="margin:0 0 16px;color:#555;font-size:16px;line-height:1.7">Your Zoravelle account is ready. We are glad you are here.</p><p style="margin:0 0 28px;color:#555;font-size:16px;line-height:1.7">Discover considered frames, thoughtful lens options, and styles made for everyday wear.</p>' +
    '<p style="margin:32px 0 0;color:#777;font-size:13px;line-height:1.6">You received this email because an account was created with this address.</p></td></tr>' +
    '<tr><td style="padding:22px 36px;background:#faf9f7;color:#888;font-size:12px;line-height:1.6;text-align:center">Zoravelle &middot; Eyewear for every day</td></tr></table></td></tr></table></body></html>';
}

export async function sendWelcomeEmail(user) {
  try {
    const from = process.env.RESEND_FROM_EMAIL?.trim();
    const to = String(user?.email || "").trim();
    if (!from) throw new Error("RESEND_FROM_EMAIL_MISSING");
    if (!to) throw new Error("WELCOME_RECIPIENT_MISSING");

    const fullName = String(user?.name || "").trim().replaceAll(String.fromCharCode(13), " ").replaceAll(String.fromCharCode(10), " ").replaceAll(String.fromCharCode(9), " ").slice(0, 80);
    const firstName = fullName ? fullName.split(" ").filter(Boolean)[0] : "there";
    const text = [
      "Hi " + firstName + ",",
      "",
      "Welcome to Zoravelle. Your account is ready, and we are glad you are here.",
      "",
      "Discover considered frames, thoughtful lens options, and styles made for everyday wear.",
      "",
      "Zoravelle - Eyewear for every day",
    ].filter((line) => line !== null).join(String.fromCharCode(10));

    const { error } = await getResendClient().emails.send({
      from,
      to: [to],
      subject: "Welcome to Zoravelle",
      html: welcomeHtml(firstName),
      text,
    });

    if (error) {
      console.error("[email] Resend welcome email failed", {
        name: error.name || "ResendError",
        message: error.message,
        statusCode: error.statusCode,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] Resend welcome email failed", {
      name: error?.name || "Error",
      message: error?.message || "WELCOME_EMAIL_FAILED",
      statusCode: error?.statusCode,
    });
    return false;
  }
}
