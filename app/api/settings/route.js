import { connectDB } from "@/lib/db";
import { StoreSettings } from "@/lib/models";

const defaults = { storeName: "Zoravelle", announcement: "", contactEmail: "", phone: "", freeShippingThreshold: 150, shopMaxPrice: 200 };

export async function GET() {
  try {
    await connectDB();
    const settings = await StoreSettings.findById("store").lean();
    return Response.json(settings || defaults);
  } catch { return Response.json(defaults); }
}
