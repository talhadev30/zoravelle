import "server-only";
import { isSameOriginRequest } from "@/lib/security";
import { getContactRecipient } from "@/lib/contact-recipient";
import { getResendClient } from "@/lib/resend-client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 12000;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanField(value, maxLength) {
  return typeof value === "string"
    ? value.replace(/[\r\n\t]+/g, " ").trim().slice(0, maxLength)
    : "";
}

function errorResponse(message, status) {
  return Response.json({ error: message }, { status });
}

async function readRequestBody(request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { error: errorResponse("Your message is too long.", 413) };
  }

  const reader = request.body?.getReader();
  if (!reader) return { error: errorResponse("Send a valid contact message.", 400) };

  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return { error: errorResponse("Your message is too long.", 413) };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { body: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { error: errorResponse("Send a valid contact message.", 400) };
  }
}

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return errorResponse("This request is not allowed.", 403);
  }

  const parsed = await readRequestBody(request);
  if (parsed.error) return parsed.error;

  const submitted =
    parsed.body && typeof parsed.body === "object" && !Array.isArray(parsed.body)
      ? parsed.body
      : {};
  if (String(submitted.botcheck || "").trim()) {
    return Response.json({ ok: true });
  }

  const name = cleanField(submitted.name, 100);
  const email = cleanField(submitted.email, 254).toLowerCase();
  const topic = cleanField(submitted.topic, 120);
  const message =
    typeof submitted.message === "string" ? submitted.message.trim() : "";

  if (!name) return errorResponse("Enter your name.", 400);
  if (!EMAIL_PATTERN.test(email)) return errorResponse("Enter a valid email address.", 400);
  if (!topic) return errorResponse("Enter a subject.", 400);
  if (!message || message.length > 5000) {
    return errorResponse("Enter a message of up to 5000 characters.", 400);
  }

  try {
    const recipient = await getContactRecipient();
    if (!recipient) {
      console.error("[contact] message not sent", { reason: "recipient_not_configured" });
      return errorResponse("The contact form is temporarily unavailable.", 503);
    }

    const from = process.env.RESEND_FROM_EMAIL?.trim();
    if (!from) {
      console.error("[contact] message not sent", { reason: "sender_not_configured" });
      return errorResponse("The contact form is temporarily unavailable.", 503);
    }

    const text = [
      "A new message was sent from the Zoravelle contact form.",
      "",
      "Name: " + name,
      "Email: " + email,
      "Subject: " + topic,
      "",
      message,
    ].join("\n");
    const safeEmail = escapeHtml(email);
    const html = [
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New contact message</title></head>',
      '<body style="margin:0;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;color:#171717">',
      '<div style="display:none;max-height:0;overflow:hidden;opacity:0">A visitor sent a message through your Zoravelle contact form.</div>',
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2ee;padding:32px 16px"><tr><td align="center">',
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:18px;overflow:hidden">',
      '<tr><td style="padding:28px 32px;background:#faf9f7"><p style="margin:0 0 8px;font-size:12px;letter-spacing:3px;font-weight:700">ZORAVELLE</p><h1 style="margin:0;font-size:25px;line-height:1.3">New contact message</h1></td></tr>',
      '<tr><td style="padding:28px 32px"><p style="margin:0 0 12px"><strong>From</strong><br>' + escapeHtml(name) + '</p>',
      '<p style="margin:0 0 12px"><strong>Email</strong><br><a style="color:#171717" href="mailto:' + safeEmail + '">' + safeEmail + '</a></p>',
      '<p style="margin:0 0 20px"><strong>Subject</strong><br>' + escapeHtml(topic) + '</p>',
      '<div style="border-top:1px solid #e7e4df;padding-top:20px;line-height:1.7;white-space:pre-wrap">' + escapeHtml(message) + '</div></td></tr>',
      '<tr><td style="padding:18px 32px;background:#faf9f7;color:#777;font-size:12px;text-align:center">Reply directly to this email to respond to the sender.</td></tr>',
      '</table></td></tr></table></body></html>',
    ].join("");

    const { error } = await getResendClient().emails.send({
      from,
      to: [recipient],
      replyTo: email,
      subject: "Contact form: " + topic,
      text,
      html,
    });
    if (error) {
      console.error("[contact] Resend send failed", {
        name: error.name || "ResendError",
        message: error.message,
        statusCode: error.statusCode,
      });
      return errorResponse("We could not send your message right now. Please try again later.", 503);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[contact] Resend send failed", {
      name: error?.name || "Error",
      message: error?.message || "CONTACT_EMAIL_FAILED",
      statusCode: error?.statusCode,
      code: error?.code,
    });
    return errorResponse("We could not send your message right now. Please try again later.", 503);
  }
}