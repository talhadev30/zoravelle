import "server-only";
import { getContactRecipient } from "@/lib/contact-recipient";
import { getResendClient } from "@/lib/resend-client";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAmount(value) {
  return "PKR " + new Intl.NumberFormat("en-PK").format(Number(value) || 0);
}

export async function sendOrderAdminEmail(order) {
  try {
    const from = process.env.RESEND_FROM_EMAIL?.trim();
    const recipient = await getContactRecipient();
    if (!from || !recipient) {
      console.error("[email] order notification not sent", {
        reason: !from ? "sender_not_configured" : "recipient_not_configured",
      });
      return false;
    }

    const orderNo = String(order?.orderNo || "New order");
    const items = Array.isArray(order?.items) ? order.items : [];
    const itemLines = items.map((item) => {
      const lineTotal = Number(item.unitPrice) * Number(item.qty);
      return item.name + " | " + item.color + " | Qty " + item.qty + " | " + formatAmount(lineTotal);
    });
    const text = [
      "A customer placed a new order on Zoravelle.",
      "",
      "Order: " + orderNo,
      "Customer: " + String(order?.customerName || ""),
      "Email: " + String(order?.email || ""),
      "Phone: " + String(order?.phone || ""),
      "Address: " + [order?.address, order?.city, order?.postalCode].filter(Boolean).join(", "),
      "",
      "Items:",
      ...itemLines,
      "",
      "Subtotal: " + formatAmount(order?.subtotal),
      "Shipping: " + formatAmount(order?.shipping),
      "Total: " + formatAmount(order?.total),
      "Payment: " + String(order?.paymentMethod || "Cash on delivery"),
    ].join("\n");

    const itemRows = items.map((item) => {
      const name = escapeHtml(item.name);
      const color = escapeHtml(item.color);
      const qty = Number(item.qty) || 0;
      const total = formatAmount(Number(item.unitPrice) * qty);
      return '<tr><td style="padding:12px;border-bottom:1px solid #eee">' + name + '<br><span style="color:#777;font-size:12px">' + color + '</span></td><td style="padding:12px;border-bottom:1px solid #eee;text-align:center">' + qty + '</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right">' + escapeHtml(total) + '</td></tr>';
    }).join("");
    const address = [order?.address, order?.city, order?.postalCode].filter(Boolean).join(", ");
    const html = [
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New Zoravelle order</title></head>',
      '<body style="margin:0;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;color:#171717">',
      '<div style="display:none;max-height:0;overflow:hidden;opacity:0">Order ' + escapeHtml(orderNo) + ' was placed on your store.</div>',
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2ee;padding:32px 16px"><tr><td align="center">',
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:18px;overflow:hidden">',
      '<tr><td style="padding:28px 32px;background:#faf9f7"><p style="margin:0 0 8px;font-size:12px;letter-spacing:3px;font-weight:700">ZORAVELLE</p><h1 style="margin:0;font-size:25px;line-height:1.3">New order received</h1><p style="margin:8px 0 0;color:#666">' + escapeHtml(orderNo) + '</p></td></tr>',
      '<tr><td style="padding:28px 32px"><h2 style="margin:0 0 14px;font-size:17px">Customer details</h2>',
      '<p style="margin:0 0 8px"><strong>' + escapeHtml(order?.customerName || "") + '</strong></p>',
      '<p style="margin:0 0 8px"><a style="color:#171717" href="mailto:' + escapeHtml(order?.email || "") + '">' + escapeHtml(order?.email || "") + '</a></p>',
      '<p style="margin:0 0 8px">' + escapeHtml(order?.phone || "") + '</p><p style="margin:0 0 22px;line-height:1.6">' + escapeHtml(address) + '</p>',
      '<h2 style="margin:0 0 10px;font-size:17px">Order items</h2>',
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px"><thead><tr><th style="padding:10px 12px;text-align:left;background:#faf9f7">Item</th><th style="padding:10px 12px;background:#faf9f7">Qty</th><th style="padding:10px 12px;text-align:right;background:#faf9f7">Total</th></tr></thead><tbody>' + itemRows + '</tbody></table>',
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;font-size:14px"><tr><td style="padding:5px 0;color:#666">Subtotal</td><td style="padding:5px 0;text-align:right">' + escapeHtml(formatAmount(order?.subtotal)) + '</td></tr>',
      '<tr><td style="padding:5px 0;color:#666">Shipping</td><td style="padding:5px 0;text-align:right">' + escapeHtml(formatAmount(order?.shipping)) + '</td></tr>',
      '<tr><td style="padding:10px 0;border-top:1px solid #e7e4df;font-weight:700">Total</td><td style="padding:10px 0;border-top:1px solid #e7e4df;text-align:right;font-weight:700">' + escapeHtml(formatAmount(order?.total)) + '</td></tr></table>',
      '<p style="margin:18px 0 0;color:#777;font-size:13px">Payment: ' + escapeHtml(order?.paymentMethod || "Cash on delivery") + '</p></td></tr>',
      '<tr><td style="padding:18px 32px;background:#faf9f7;color:#777;font-size:12px;text-align:center">A new order was placed on your Zoravelle store.</td></tr>',
      '</table></td></tr></table></body></html>',
    ].join("");

    const { error } = await getResendClient().emails.send({
      from,
      to: [recipient],
      replyTo: String(order?.email || ""),
      subject: "New order: " + orderNo,
      text,
      html,
    });
    if (error) {
      console.error("[email] Resend order notification failed", {
        name: error.name || "ResendError",
        message: error.message,
        statusCode: error.statusCode,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] Resend order notification failed", {
      name: error?.name || "Error",
      message: error?.message || "ORDER_EMAIL_FAILED",
      statusCode: error?.statusCode,
    });
    return false;
  }
}