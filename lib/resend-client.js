import "server-only";
import { Resend } from "resend";

let resend;

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY_MISSING");
  resend ||= new Resend(apiKey);
  return resend;
}