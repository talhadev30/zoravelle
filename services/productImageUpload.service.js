import {
  enhanceImageWithCloudflare,
  getCloudflareImageEnv,
} from "@/services/imageProcessing.service";
import {
  getImageKitEnv,
  isImageKitUrl,
  PRODUCT_IMAGE_FOLDER,
  uploadToImageKit,
} from "@/services/imagekit.service";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function imageProcessingFallbackEnabled() {
  const value =
    process.env.IMAGE_PROCESSING_FALLBACK?.trim().toLowerCase() || "false";
  if (value !== "true" && value !== "false") {
    const error = new Error("IMAGE_PROCESSING_FALLBACK must be true or false.");
    error.code = "ENV_CONFIG";
    throw error;
  }
  return value === "true";
}

export class ProductImageUploadError extends Error {
  constructor(message, status, step, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = "ProductImageUploadError";
    this.status = status;
    this.step = step;
  }
}

function validateFile(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new ProductImageUploadError(
      "Choose an image file to upload.",
      400,
      "validation",
    );
  }
  if (file.size === 0) {
    throw new ProductImageUploadError(
      "The selected image is empty.",
      400,
      "validation",
    );
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ProductImageUploadError(
      "Image must be 10 MB or smaller.",
      413,
      "validation",
    );
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ProductImageUploadError(
      "Upload a JPG, PNG, or WebP image.",
      400,
      "validation",
    );
  }
}

function fileExtensionForMimeType(mimeType) {
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function fileNameForMimeType(fileName, mimeType) {
  const baseName = fileName.replace(/\.[^.]+$/, "") || "product-image";
  return baseName + "." + fileExtensionForMimeType(mimeType);
}

function cloudflareErrorMessage(error) {
  if (error?.code === "ENV_CONFIG")
    return "Cloudflare Workers AI is not configured on the server.";
  const messages = {
    400: "Cloudflare rejected the image or model request. Check the image and CLOUDFLARE_IMAGE_MODEL.",
    401: "Cloudflare rejected the API token. Check CLOUDFLARE_API_TOKEN.",
    403: "This Cloudflare token needs Workers AI Read and Workers AI Edit permissions, or this model is unavailable to the account.",
    429: "Cloudflare Workers AI free daily quota was reached. Try again after the daily reset.",
  };
  return messages[error?.status] || "Cloudflare image enhancement failed.";
}

export async function processProductImageUpload(file) {
  validateFile(file);

  let imageKitEnv;
  let fallbackEnabled;
  try {
    imageKitEnv = getImageKitEnv();
    fallbackEnabled = imageProcessingFallbackEnabled();
    if (!fallbackEnabled) getCloudflareImageEnv();
  } catch (error) {
    console.error(
      "[image-upload] validation failed for image service configuration:",
      error,
    );
    throw new ProductImageUploadError(
      "Image upload is not configured on the server.",
      500,
      "validation",
      error,
    );
  }

  let originalBuffer;
  try {
    originalBuffer = Buffer.from(await file.arrayBuffer());
  } catch (error) {
    throw new ProductImageUploadError(
      "Could not read the selected image.",
      400,
      "validation",
      error,
    );
  }

  let uploadBuffer = originalBuffer;
  let uploadMimeType = file.type === "image/jpg" ? "image/jpeg" : file.type;
  let enhanced = false;

  try {
    const processed = await enhanceImageWithCloudflare(
      originalBuffer,
      uploadMimeType,
    );
    uploadBuffer = processed.buffer;
    uploadMimeType = processed.mimeType;
    enhanced = true;
  } catch (error) {
    console.error(
      "[image-upload] Cloudflare AI image processing failed:",
      error,
    );
    if (!fallbackEnabled) {
      throw new ProductImageUploadError(
        cloudflareErrorMessage(error),
        error?.code === "ENV_CONFIG" ? 500 : 502,
        "ai",
        error,
      );
    }
  }

  try {
    const fileName = enhanced
      ? fileNameForMimeType(file.name, uploadMimeType)
      : file.name;
    const uploaded = await uploadToImageKit(
      uploadBuffer,
      fileName,
      PRODUCT_IMAGE_FOLDER,
    );
    if (!isImageKitUrl(uploaded.url, imageKitEnv.urlEndpoint)) {
      throw new Error(
        "ImageKit returned a URL outside the configured endpoint.",
      );
    }

    return {
      url: uploaded.url,
      fileId: uploaded.fileId,
      enhanced,
      originalName: file.name,
    };
  } catch (error) {
    console.error("[image-upload] imagekit failed:", error);
    throw new ProductImageUploadError(
      "ImageKit upload failed.",
      502,
      "imagekit",
      error,
    );
  }
}
