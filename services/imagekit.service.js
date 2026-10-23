import ImageKit from "imagekit";

export const PRODUCT_IMAGE_FOLDER = "/products";
export const PRODUCT_TRY_ON_IMAGE_FOLDER = "/products/try-on";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    const error = new Error("Missing required environment variable: " + name);
    error.code = "ENV_CONFIG";
    throw error;
  }
  return value;
}

function parseImageKitEndpoint(value) {
  let endpoint;
  try {
    endpoint = new URL(value);
  } catch {
    const error = new Error("IMAGEKIT_URL_ENDPOINT must be a valid HTTPS URL.");
    error.code = "ENV_CONFIG";
    throw error;
  }

  if (endpoint.protocol !== "https:" || !endpoint.hostname || endpoint.username || endpoint.password) {
    const error = new Error("IMAGEKIT_URL_ENDPOINT must be a valid HTTPS URL.");
    error.code = "ENV_CONFIG";
    throw error;
  }
  return endpoint.toString().replace(/\/$/, "");
}

export function getImageKitEnv() {
  return {
    publicKey: requiredEnv("IMAGEKIT_PUBLIC_KEY"),
    privateKey: requiredEnv("IMAGEKIT_PRIVATE_KEY"),
    urlEndpoint: parseImageKitEndpoint(requiredEnv("IMAGEKIT_URL_ENDPOINT")),
  };
}

export function getImageKitUrlEndpoint() {
  return parseImageKitEndpoint(requiredEnv("IMAGEKIT_URL_ENDPOINT"));
}

export function isImageKitUrl(value, endpointValue) {
  try {
    const imageUrl = new URL(value);
    const endpoint = new URL(endpointValue);
    const basePath = endpoint.pathname.replace(/\/+$/, "");
    const pathPrefix = basePath ? basePath + "/" : "/";

    return imageUrl.protocol === "https:" &&
      imageUrl.origin === endpoint.origin &&
      imageUrl.pathname.startsWith(pathPrefix);
  } catch {
    return false;
  }
}

let imageKitClient;

function getImageKitClient() {
  if (!imageKitClient) {
    imageKitClient = new ImageKit(getImageKitEnv());
  }
  return imageKitClient;
}

function safeFileName(fileName) {
  const cleaned = String(fileName || "product-image.jpg")
    .replace(/[\\/\0]/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 180);
  return cleaned || "product-image.jpg";
}

export async function uploadToImageKit(buffer, fileName, folder = PRODUCT_IMAGE_FOLDER) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("ImageKit upload requires a non-empty image buffer.");
  }

  const result = await getImageKitClient().upload({
    file: buffer,
    fileName: safeFileName(fileName),
    folder: folder || PRODUCT_IMAGE_FOLDER,
    useUniqueFileName: true,
    isPrivateFile: false,
  });

  if (!result?.url || !result?.fileId) {
    throw new Error("ImageKit returned an incomplete upload response.");
  }

  return { url: result.url, fileId: result.fileId, name: result.name || fileName };
}