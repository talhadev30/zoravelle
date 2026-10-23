import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth";
import { getImageKitEnv, isImageKitUrl, PRODUCT_TRY_ON_IMAGE_FOLDER, uploadToImageKit } from "@/services/imagekit.service";
import { isSameOriginRequest } from "@/lib/security";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function json(body, status) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return json({ error: "This upload request is not allowed." }, 403);
  }

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return json({ error: "Could not verify admin access." }, 500);
  }
  if (!user) return json({ error: "Please log in as an admin." }, 401);
  if (user.role !== "admin") return json({ error: "Admin access required." }, 403);

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_BYTES + 128 * 1024) {
    return json({ error: "Image must be 10 MB or smaller." }, 413);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "Send the image as multipart form data." }, 400);
  }

  const file = formData.get("image");
  if (!file || typeof file.arrayBuffer !== "function" || !file.size) {
    return json({ error: "Choose a try-on image to upload." }, 400);
  }
  if (file.size > MAX_FILE_BYTES) return json({ error: "Image must be 10 MB or smaller." }, 413);
  if (!allowedTypes.has(file.type)) return json({ error: "Upload a JPG, PNG, or WebP image." }, 400);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer, { limitInputPixels: MAX_PIXELS, failOn: "error" }).metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format)) {
      return json({ error: "The file contents are not a supported image." }, 400);
    }
    if (!metadata.width || !metadata.height || metadata.width < 256 || metadata.height < 256) {
      return json({ error: "Use a front-facing image at least 256 pixels wide and tall." }, 400);
    }
    if (metadata.width * metadata.height > MAX_PIXELS) {
      return json({ error: "Image dimensions are too large." }, 413);
    }

    const endpoint = getImageKitEnv().urlEndpoint;
    const safeName = String(file.name || "try-on-frame.png").replace(/.[^.]+$/, "") + "." + metadata.format;
    const uploaded = await uploadToImageKit(buffer, safeName, PRODUCT_TRY_ON_IMAGE_FOLDER);
    if (!isImageKitUrl(uploaded.url, endpoint)) {
      return json({ error: "ImageKit returned an invalid image URL." }, 502);
    }
    return json({ url: uploaded.url }, 200);
  } catch {
    return json({ error: "Could not upload the try-on image." }, 502);
  }
}