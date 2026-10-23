import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models";
import {
  getVirtualTryOnDayKey,
  VIRTUAL_TRY_ON_DAILY_LIMIT,
  assertVirtualTryOnConfigured,
  generateVirtualTryOn,
  loadProductTryOnImage,
  normalizeTryOnImage,
  VirtualTryOnError,
} from "@/services/virtualTryOn.service";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FACE_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FACE_IMAGE_BYTES + 128 * 1024;
const RATE_LIMIT_MS = 10_000;
const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const usageByUser =
  globalThis.__zvVirtualTryOnUsage ??= new Map();

function json(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function validProductId(value) {
  return /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(value || "");
}

function currentUsage(userId) {
  const key = String(userId);
  const day = getVirtualTryOnDayKey();
  let usage = usageByUser.get(key);

  if (!usage || usage.day !== day) {
    usage = {
      day,
      successfulCount: 0,
      reservedCount: 0,
      lastRequestAt: 0,
    };
    usageByUser.set(key, usage);
    if (usageByUser.size > 5000) {
      usageByUser.delete(usageByUser.keys().next().value);
    }
  }

  return usage;
}

function allowance(userId) {
  const usage = currentUsage(userId);
  return {
    limit: VIRTUAL_TRY_ON_DAILY_LIMIT,
    successfulCount: usage.successfulCount,
    reservedCount: usage.reservedCount,
    remaining: Math.max(
      0,
      VIRTUAL_TRY_ON_DAILY_LIMIT - usage.successfulCount - usage.reservedCount,
    ),
  };
}

function reserveAttempt(userId) {
  const usage = currentUsage(userId);
  const now = Date.now();
  const remaining = allowance(userId).remaining;

  if (remaining <= 0) return { type: "limit" };
  const waitMs = RATE_LIMIT_MS - (now - usage.lastRequestAt);
  if (waitMs > 0) {
    return { type: "rate-limit", retryAfter: Math.ceil(waitMs / 1000) };
  }

  usage.lastRequestAt = now;
  usage.reservedCount += 1;
  return { type: "reserved" };
}

function finishAttempt(userId, countAttempt) {
  const usage = currentUsage(userId);
  usage.reservedCount = Math.max(0, usage.reservedCount - 1);
  if (countAttempt) usage.successfulCount += 1;
}

function messageForCode(code) {
  return {
    PRODUCT_NOT_FOUND: "This product is no longer available.",
    PRODUCT_IMAGE_UNAVAILABLE: "This product is not set up for virtual try-on yet.",
    PRODUCT_IMAGE_TOO_LARGE: "The product try-on image is too large.",
    PRODUCT_TRY_ON_IMAGE_MISSING: "This frame is not set up for virtual try-on yet.",
    INVALID_IMAGE: "Upload a valid JPG, PNG, or WebP image.",
    IMAGE_TOO_SMALL: "Upload a clear photo at least 200 pixels wide and tall.",
    IMAGE_TOO_LARGE: "The selected photo is too large to process.",
    MODEL_UNSUPPORTED: "Virtual try-on is not configured for this Cloudflare model.",
    CLOUDFLARE_CONFIG: "Cloudflare Workers AI is not configured for virtual try-on.",
    IMAGEKIT_CONFIG: "ImageKit is not configured for virtual try-on.",
    PROVIDER_LIMIT: "The AI service is busy. Please try again shortly.",
    PROVIDER_REJECTED: "The AI could not process this photo. Try a clear, front-facing image.",
    INVALID_PROVIDER_IMAGE: "The AI could not return a usable preview.",
    PROVIDER_TIMEOUT: "The AI could not confirm a preview. Please try again.",
    PROVIDER_UNAVAILABLE: "The AI could not confirm a preview. Please try again.",
    TRY_ON_ERROR: "Virtual try-on is temporarily unavailable.",
  }[code] || "Virtual try-on is temporarily unavailable.";
}

async function readBoundedBody(request) {
  if (!request.body) {
    throw new VirtualTryOnError("Upload a photo to continue.", {
      status: 400,
      code: "INVALID_IMAGE",
    });
  }
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new VirtualTryOnError("Photo must be 5 MB or smaller.", {
        status: 413,
        code: "IMAGE_TOO_LARGE",
      });
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, total);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Please log in to use virtual try-on." }, 401);
    assertVirtualTryOnConfigured();
    return json({ available: true, ...allowance(user.id) });
  } catch (error) {
    if (error instanceof VirtualTryOnError) {
      return json({ available: false, error: messageForCode(error.code) }, error.status);
    }
    return json({ available: false, error: "Virtual try-on is temporarily unavailable." }, 503);
  }
}

export async function POST(request) {
  if (!sameOrigin(request)) {
    return json({ error: "This request is not allowed." }, 403);
  }
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("multipart/form-data")) {
    return json({ error: "Send your photo as multipart form data." }, 400);
  }

  const productId = request.headers.get("x-product-id") || "";
  if (!validProductId(productId)) {
    return json({ error: "Choose a valid product." }, 400);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return json({ error: "Photo must be 5 MB or smaller." }, 413);
  }

  let userId = "";
  let reserved = false;
  let providerStarted = false;

  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Please log in to use virtual try-on." }, 401);
    userId = String(user.id);
    assertVirtualTryOnConfigured();

    const body = await readBoundedBody(request);
    let formData;
    try {
      const boundedRequest = new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body,
      });
      formData = await boundedRequest.formData();
    } catch {
      throw new VirtualTryOnError("Send your photo as multipart form data.", {
        status: 400,
        code: "INVALID_IMAGE",
      });
    }

    const submittedProductId = String(formData.get("productId") || "");
    const photo = formData.get("photo");
    if (submittedProductId !== productId) {
      throw new VirtualTryOnError("Choose a valid product.", {
        status: 400,
        code: "PRODUCT_NOT_FOUND",
      });
    }
    if (!photo || typeof photo.arrayBuffer !== "function" || !photo.size) {
      throw new VirtualTryOnError("Upload a photo to continue.", {
        status: 400,
        code: "INVALID_IMAGE",
      });
    }
    if (photo.size > MAX_FACE_IMAGE_BYTES) {
      throw new VirtualTryOnError("Photo must be 5 MB or smaller.", {
        status: 413,
        code: "IMAGE_TOO_LARGE",
      });
    }
    if (!ALLOWED_FILE_TYPES.has(photo.type)) {
      throw new VirtualTryOnError("Use a JPG, PNG, or WebP image.", {
        status: 400,
        code: "INVALID_IMAGE",
      });
    }

    const faceBuffer = await normalizeTryOnImage(
      Buffer.from(await photo.arrayBuffer()),
    );
    await connectDB();
    const product = await Product.findOne({ id: productId })
      .select("id name tryOnImage image")
      .lean();

    if (!product) {
      throw new VirtualTryOnError("This product is no longer available.", {
        status: 404,
        code: "PRODUCT_NOT_FOUND",
      });
    }

    const productImageUrl = product.tryOnImage || product.image;
    if (!productImageUrl) {
      throw new VirtualTryOnError("The product image is not available for virtual try-on.", {
        status: 422,
        code: "PRODUCT_IMAGE_UNAVAILABLE",
      });
    }
    const productBuffer = await loadProductTryOnImage(productImageUrl);

    const reservation = reserveAttempt(userId);
    if (reservation.type === "limit") {
      return json(
        {
          status: "rejected",
          error: "You have used both of your available try-ons for today.",
          ...allowance(userId),
        },
        429,
      );
    }
    if (reservation.type === "rate-limit") {
      return json(
        {
          status: "rejected",
          error: "Please wait a few seconds before starting another try-on.",
          ...allowance(userId),
        },
        429,
        { "Retry-After": String(reservation.retryAfter) },
      );
    }

    reserved = true;
    providerStarted = true;
    const generated = await generateVirtualTryOn(productBuffer, faceBuffer);
    const result = "data:image/webp;base64," + generated.buffer.toString("base64");

    finishAttempt(userId, true);
    reserved = false;
    return json({ status: "succeeded", result, ...allowance(userId) });
  } catch (error) {
    if (reserved) {
      finishAttempt(
        userId,
        providerStarted &&
          (error?.outcomeUnknown || !(error instanceof VirtualTryOnError)),
      );
    }

    if (error instanceof VirtualTryOnError) {
      return json(
        { status: "failed", error: messageForCode(error.code), ...(userId ? allowance(userId) : {}) },
        error.status,
      );
    }
    return json({ error: "Virtual try-on is temporarily unavailable." }, 503);
  }
}
