import { getCurrentUser } from "@/lib/auth";
import { ProductImageUploadError, processProductImageUpload } from "@/services/productImageUpload.service";
import { isSameOriginRequest } from "@/lib/security";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024;

function errorResponse(message, status) {
  return Response.json({ error: message }, { status });
}

export async function POST(request) {
  if (!isSameOriginRequest(request)) return errorResponse("This request is not allowed.", 403);
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("[image-upload] validation failed while checking admin access:", error);
    return errorResponse("Could not verify admin access.", 500);
  }

  if (!user) return errorResponse("Please log in as an admin.", 401);
  if (user.role !== "admin") return errorResponse("Admin access required.", 403);

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_SIZE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES) {
    return errorResponse("Image must be 10 MB or smaller.", 413);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("[image-upload] validation failed while reading multipart form data:", error);
    return errorResponse("Send the image as multipart form data.", 400);
  }

  try {
    const result = await processProductImageUpload(formData.get("image"));
    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ProductImageUploadError) {
      console.error(`[image-upload] ${error.step} failed:`, error.cause || error);
      return errorResponse(error.message, error.status);
    }
    console.error("[image-upload] validation failed:", { name: error?.name });
    return errorResponse("Image upload failed.", 500);
  }
}