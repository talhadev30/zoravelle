import sharp from "sharp";

export const DEFAULT_IMAGE_EDIT_PROMPT = `Enhance the uploaded eyeglasses photograph into a premium luxury e-commerce product image for the Zoravelle eyewear brand.
**Preserve the exact original product:** black glossy acetate browline frame, thin gold-tone metal lower rims, gold temples with black tips, clear transparent lenses, adjustable nose pads, original hinge construction, rivets, proportions, and frame shape. Do not redesign or replace any product details.
**Composition:** Create a perfectly centered, elegant three-quarter product view with both lenses and the temples clearly visible. Make the glasses fill approximately 80\u201385% of the square canvas while keeping the entire product inside the frame. Maintain natural, realistic perspective.
**Lighting and background:** Use a seamless pure white studio background (#FFFFFF), soft diffused commercial lighting, subtle realistic contact shadows beneath the glasses, controlled reflections on the glossy black acetate, and refined gold highlights. Keep the transparent lenses clear and free from excessive glare.
**Image quality:** Ultra-sharp product details, realistic materials, accurate black and gold colors, professional optical-product photography, balanced exposure, clean edges, premium luxury retail aesthetic, high resolution.
**Strict restrictions:** No text, no logos, no watermark, no props, no people, no additional glasses, no colored background, no gradients, no exaggerated reflections, no distorted frames, no missing components, and no invented product features.
**Output:** 1:1 square aspect ratio, 1200 \u00D7 1200 pixels, suitable for a premium online eyewear product listing. The final result must look like authentic commercial product photography, not an illustration or 3D render.  make suret the image size is 1200 × 1200 px. also make sure in png no background.`;
export const DEFAULT_CLOUDFLARE_IMAGE_MODEL =
  "@cf/black-forest-labs/flux-2-klein-4b";
export const DEFAULT_IMAGE_AI_TIMEOUT_MS = 120_000;

function configurationError(message) {
  const error = new Error(message);
  error.code = "ENV_CONFIG";
  return error;
}

export function getCloudflareImageEnv() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const model =
    process.env.CLOUDFLARE_IMAGE_MODEL?.trim() ||
    DEFAULT_CLOUDFLARE_IMAGE_MODEL;

  if (!accountId) {
    throw configurationError(
      "Missing required environment variable: CLOUDFLARE_ACCOUNT_ID",
    );
  }
  if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    throw configurationError(
      "CLOUDFLARE_ACCOUNT_ID must be the 32-character account ID from Cloudflare.",
    );
  }
  if (!apiToken) {
    throw configurationError(
      "Missing required environment variable: CLOUDFLARE_API_TOKEN",
    );
  }
  if (
    !/^@[a-z0-9-]+\/[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/i.test(
      model,
    )
  ) {
    throw configurationError(
      "CLOUDFLARE_IMAGE_MODEL must be a Workers AI model slug.",
    );
  }

  return { accountId, apiToken, model };
}

function getTimeout(options) {
  return Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
    ? options.timeoutMs
    : DEFAULT_IMAGE_AI_TIMEOUT_MS;
}



async function readProviderError(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("json")) {
    try {
      const payload = await response.json();
      const messages = payload?.errors
        ?.map((item) => item?.message)
        .filter(Boolean);
      return (
        messages?.join("; ") ||
        payload?.error?.message ||
        payload?.message ||
        "HTTP " + response.status
      );
    } catch {
      return "HTTP " + response.status;
    }
  }

  try {
    const message = (await response.text()).trim();
    return message.slice(0, 500) || "HTTP " + response.status;
  } catch {
    return "HTTP " + response.status;
  }
}

function decodeImageResponse(payload) {
  const value =
    payload?.result?.image ||
    payload?.image ||
    payload?.result?.image_base64 ||
    payload?.image_base64;
  if (typeof value !== "string" || value.length === 0) return null;

  const dataUri = value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/is);
  const base64 = dataUri ? dataUri[2] : value;
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) return null;

  return {
    buffer,
    mimeType: dataUri?.[1] || "image/png",
  };
}

export async function enhanceImageWithCloudflare(
  buffer,
  mimeType,
  options = {},
) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error(
      "Cloudflare image processing requires a non-empty image buffer.",
    );
  }
  if (!mimeType?.startsWith("image/")) {
    throw new Error(
      "Cloudflare image processing requires a valid image MIME type.",
    );
  }

  const { accountId, apiToken, model } = getCloudflareImageEnv();
  const timeoutMs = getTimeout(options);

  let resized;
  try {
    resized = await sharp(buffer, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: 511,
        height: 511,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    throw new Error("Could not prepare this image for Cloudflare AI.", {
      cause: error,
    });
  }

  const formData = new FormData();
  formData.append("prompt", DEFAULT_IMAGE_EDIT_PROMPT);
  formData.append(
    "input_image_0",
    new Blob([resized.data], { type: "image/png" }),
    "product-reference.png",
  );
  formData.append("width", "1200");
  formData.append("height", "1200");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const endpoint =
    "https://api.cloudflare.com/client/v4/accounts/" +
    accountId +
    "/ai/run/" +
    model;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: "Bearer " + apiToken },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(
        "Cloudflare image request failed: " +
          (await readProviderError(response)),
      );
      error.status = response.status;
      throw error;
    }

    const responseType = response.headers.get("content-type") || "";
    let image;
    if (
      responseType.startsWith("image/") ||
      responseType.includes("octet-stream")
    ) {
      image = {
        buffer: Buffer.from(await response.arrayBuffer()),
        mimeType: responseType.startsWith("image/")
          ? responseType.split(";")[0]
          : "image/png",
      };
    } else {
      let payload;
      try {
        payload = await response.json();
      } catch (error) {
        throw new Error("Cloudflare returned an unreadable image response.", {
          cause: error,
        });
      }
      image = decodeImageResponse(payload);
    }

    if (!image?.buffer?.length) {
      throw new Error(
        "Cloudflare returned no edited image. Check that the selected model supports image editing.",
      );
    }
    return image;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Cloudflare image processing timed out after " +
          Math.ceil(timeoutMs / 1000) +
          " seconds.",
        { cause: error },
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
