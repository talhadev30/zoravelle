import "server-only";
import { dbConnect } from "@/lib/db";
import { StoreSettings, User } from "@/lib/models";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getContactRecipient() {
  const configured = process.env.CONTACT_TO_EMAIL?.trim();
  if (configured && EMAIL_PATTERN.test(configured)) return configured;

  await dbConnect();
  const [settings, admin] = await Promise.all([
    StoreSettings.findById("store").select("contactEmail").lean(),
    User.findOne({ role: "admin" }).select("email").lean(),
  ]);

  return [settings?.contactEmail, admin?.email]
    .map((value) => String(value || "").trim())
    .find((value) => EMAIL_PATTERN.test(value)) || "";
}