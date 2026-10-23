import sharp from "sharp";
import {
  DEFAULT_CLOUDFLARE_IMAGE_MODEL,
  getCloudflareImageEnv,
} from "@/services/imageProcessing.service";
import {
  getImageKitUrlEndpoint,
  isImageKitUrl,
} from "@/services/imagekit.service";

const MAX_INPUT_PIXELS = 40_000_000;
const MAX_REMOTE_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 6 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export const VIRTUAL_TRY_ON_DAILY_LIMIT = 2;

const TRY_ON_TIME_ZONE = "Asia/Karachi";
const TRY_ON_DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: TRY_ON_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getVirtualTryOnDayKey(date = new Date()) {
  const parts = Object.fromEntries(
    TRY_ON_DAY_FORMATTER.formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return parts.year + "-" + parts.month + "-" + parts.day;
}

export class VirtualTryOnError extends Error {
  constructor(message, { status = 500, code = "TRY_ON_ERROR", outcomeUnknown = false } = {}) {
    super(message);
    this.name = "VirtualTryOnError";
    this.status = status;
    this.code = code;
    this.outcomeUnknown = outcomeUnknown;
  }
}

export function assertVirtualTryOnConfigured() {
  let configuration;
  try {
    configuration = getCloudflareImageEnv();
  } catch {
    throw new VirtualTryOnError("Cloudflare Workers AI is not configured for virtual try-on.", {
      status: 503,
      code: "CLOUDFLARE_CONFIG",
    });
  }
  if (configuration.model !== DEFAULT_CLOUDFLARE_IMAGE_MODEL) {
    throw new VirtualTryOnError(
      "The configured Cloudflare model does not support this try-on request.",
      { status: 503, code: "MODEL_UNSUPPORTED" },
    );
  }
  return configuration;
}

export async function normalizeTryOnImage(buffer, { minWidth = 200, minHeight = 200 } = {}) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new VirtualTryOnError("Choose a valid image file.", { status: 400, code: "INVALID_IMAGE" });
  }
  try {
    const pipeline = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
    const metadata = await pipeline.metadata();
    if (!ALLOWED_FORMATS.has(metadata.format) || !metadata.width || !metadata.height) {
      throw new VirtualTryOnError("Use a valid JPG, PNG, or WebP image.", { status: 400, code: "INVALID_IMAGE" });
    }
    if (metadata.width < minWidth || metadata.height < minHeight) {
      throw new VirtualTryOnError("Use a clearer image at least 200 pixels wide and tall.", { status: 400, code: "IMAGE_TOO_SMALL" });
    }
    if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {
      throw new VirtualTryOnError("This image is too large to process.", { status: 413, code: "IMAGE_TOO_LARGE" });
    }
    const normalized = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate()
      .resize({ width: 511, height: 511, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return normalized;
  } catch (error) {
    if (error instanceof VirtualTryOnError) throw error;
    throw new VirtualTryOnError("Could not read this image. Try a different JPG, PNG, or WebP file.", {
      status: 400,
      code: "INVALID_IMAGE",
    });
  }
}

async function readLimitedBody(response, maxBytes) {
  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
    throw new VirtualTryOnError("The product try-on image is too large.", {
      status: 422,
      code: "PRODUCT_IMAGE_TOO_LARGE",
    });
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new VirtualTryOnError("The product try-on image is too large.", {
        status: 422,
        code: "PRODUCT_IMAGE_TOO_LARGE",
      });
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

export async function loadProductTryOnImage(imageUrl) {
  let endpoint;
  try {
    endpoint = getImageKitUrlEndpoint();
  } catch {
    throw new VirtualTryOnError("ImageKit is not configured for virtual try-on.", {
      status: 503,
      code: "IMAGEKIT_CONFIG",
    });
  }
  if (!isImageKitUrl(imageUrl, endpoint)) {
    throw new VirtualTryOnError("This product is not configured for virtual try-on.", {
      status: 422,
      code: "PRODUCT_IMAGE_UNAVAILABLE",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(imageUrl, {
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new VirtualTryOnError("The product try-on image is unavailable.", {
        status: 422,
        code: "PRODUCT_IMAGE_UNAVAILABLE",
      });
    }
    const contentType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      throw new VirtualTryOnError("The product try-on image is not a supported image.", {
        status: 422,
        code: "PRODUCT_IMAGE_UNAVAILABLE",
      });
    }
    const buffer = await readLimitedBody(response, MAX_REMOTE_IMAGE_BYTES);
    return await normalizeTryOnImage(buffer);
  } catch (error) {
    if (error instanceof VirtualTryOnError) throw error;
    throw new VirtualTryOnError("The product try-on image could not be loaded.", {
      status: 422,
      code: "PRODUCT_IMAGE_UNAVAILABLE",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readProviderError(response) {
  try {
    const value = await response.json();
    return value?.errors?.map((entry) => entry?.message).filter(Boolean).join("; ") || value?.message || "";
  } catch {
    return "";
  }
}

function decodeImageResponse(value) {
  const candidate = value?.result?.image || value?.image || value?.result?.image_base64 || value?.image_base64;
  if (typeof candidate !== "string" || !candidate) return null;
  const dataUri = candidate.match(new RegExp("^data:image/[a-z0-9.+-]+;base64,(.*)$", "is"));
  const base64 = dataUri ? dataUri[1] : candidate;
  if (!/^[a-z0-9+/]+={0,2}$/i.test(base64)) return null;
  const buffer = Buffer.from(base64, "base64");
  return buffer.length ? buffer : null;
}

async function normalizeGeneratedImage(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_OUTPUT_BYTES) {
    throw new VirtualTryOnError("The AI returned an unusable preview.", {
      status: 502,
      code: "INVALID_PROVIDER_IMAGE",
      outcomeUnknown: true,
    });
  }
  try {
    const result = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
    if (!result.length || result.length > MAX_OUTPUT_BYTES) throw new Error("Generated image size is invalid.");
    return result;
  } catch {
    throw new VirtualTryOnError("The AI returned an unusable preview.", {
      status: 502,
      code: "INVALID_PROVIDER_IMAGE",
      outcomeUnknown: true,
    });
  }
}

export async function generateVirtualTryOn(productImage, faceImage) {
  const { accountId, apiToken, model } = assertVirtualTryOnConfigured();
  const formData = new FormData();
  formData.append(
    "prompt",
    "Image 0 shows the selected eyeglasses. Image 1 shows the customer. Create a realistic virtual try-on by placing the exact eyeglasses from image 0 on the customer's face in image 1. Preserve the customer's identity, facial features, skin tone, hair, expression, pose, clothing, and background. Preserve the eyeglasses' frame shape, color, proportions, bridge, lenses, temples, and distinctive hardware as accurately as possible. Keep reflections natural and lenses clear. Do not add text, logos, accessories, or other changes.",
  );
  formData.append("input_image_0", new Blob([productImage], { type: "image/png" }), "eyewear-reference.png");
  formData.append("input_image_1", new Blob([faceImage], { type: "image/png" }), "customer-photo.png");
  formData.append("width", "1024");
  formData.append("height", "1024");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(
      "https://api.cloudflare.com/client/v4/accounts/" + accountId + "/ai/run/" + model,
      {
        method: "POST",
        headers: { Authorization: "Bearer " + apiToken },
        body: formData,
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      const error = new VirtualTryOnError("Cloudflare rejected the try-on request.", {
        status: response.status >= 500 ? 502 : 422,
        code: response.status === 429 ? "PROVIDER_LIMIT" : "PROVIDER_REJECTED",
        outcomeUnknown: response.status >= 500,
      });
      await readProviderError(response);
      throw error;
    }

    const contentType = response.headers.get("content-type") || "";
    let image;
    if (contentType.startsWith("image/") || contentType.includes("octet-stream")) {
      image = await readLimitedBody(response, MAX_OUTPUT_BYTES);
    } else {
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new VirtualTryOnError("Cloudflare returned an unreadable image response.", {
          status: 502,
          code: "INVALID_PROVIDER_IMAGE",
          outcomeUnknown: true,
        });
      }
      image = decodeImageResponse(payload);
    }
    const normalized = await normalizeGeneratedImage(image);
    return { buffer: normalized, mimeType: "image/webp" };
  } catch (error) {
    if (error instanceof VirtualTryOnError) throw error;
    if (error?.name === "AbortError") {
      throw new VirtualTryOnError("Cloudflare did not confirm the try-on result in time.", {
        status: 504,
        code: "PROVIDER_TIMEOUT",
        outcomeUnknown: true,
      });
    }
    throw new VirtualTryOnError("Cloudflare did not confirm the try-on result.", {
      status: 502,
      code: "PROVIDER_UNAVAILABLE",
      outcomeUnknown: true,
    });
  } finally {
    clearTimeout(timeout);
  }
}