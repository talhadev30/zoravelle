import mongoose from "mongoose";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Product, TryOnJob, TryOnResult, TryOnUsage } from "@/lib/models";
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

const TRY_ON_LIMIT = VIRTUAL_TRY_ON_DAILY_LIMIT;
const MAX_FACE_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FACE_IMAGE_BYTES + 128 * 1024;
const RATE_LIMIT_MS = 10_000;
const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
let indexesPromise;

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

function validRequestId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || "");
}

function validProductId(value) {
  return /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(value || "");
}

async function ensureTryOnUsageIndexes() {
  let indexes = [];
  try {
    indexes = await TryOnUsage.collection.indexes();
  } catch (error) {
    if (error?.code !== 26 && error?.codeName !== "NamespaceNotFound") throw error;
  }

  const legacyUserIndex = indexes.find(
    (index) =>
      index.unique &&
      index.key?.userId === 1 &&
      Object.keys(index.key).length === 1,
  );
  if (legacyUserIndex) {
    try {
      await TryOnUsage.collection.dropIndex(legacyUserIndex.name);
    } catch (error) {
      if (error?.code !== 27 && error?.codeName !== "IndexNotFound") throw error;
    }
  }
  await TryOnUsage.createIndexes();
}

async function ensureStorage() {
  await connectDB();
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      ensureTryOnUsageIndexes(),
      TryOnJob.createIndexes(),
      TryOnResult.createIndexes(),
    ]).catch((error) => {
      indexesPromise = null;
      throw error;
    });
  }
  await indexesPromise;
}

function objectId(user) {
  return new mongoose.Types.ObjectId(user.id);
}

function allowance(usage) {
  const successfulCount = Math.min(TRY_ON_LIMIT, Math.max(0, Number(usage?.successfulCount) || 0));
  const reservedCount = Math.max(0, Number(usage?.reservedCount) || 0);
  return {
    limit: TRY_ON_LIMIT,
    successfulCount,
    reservedCount,
    remaining: Math.max(0, TRY_ON_LIMIT - successfulCount - reservedCount),
  };
}

async function getAllowance(userId) {
  const usage = await TryOnUsage.findOne({
    userId,
    usageDay: getVirtualTryOnDayKey(),
  })
    .select("successfulCount reservedCount")
    .lean();
  return allowance(usage);
}

async function ensureUsageRecord(userId, usageDay) {
  try {
    await TryOnUsage.updateOne(
      { userId, usageDay },
      {
        $setOnInsert: {
          userId,
          usageDay,
          successfulCount: 0,
          reservedCount: 0,
          reservedRequestIds: [],
          completedRequestIds: [],
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }
}

async function reserveAttempt(userId, requestId, usageDay) {
  await ensureUsageRecord(userId, usageDay);
  const now = new Date();
  const availableAfter = new Date(now.getTime() - RATE_LIMIT_MS);
  const reserved = await TryOnUsage.findOneAndUpdate(
    {
      userId,
      usageDay,
      reservedRequestIds: { $ne: requestId },
      completedRequestIds: { $ne: requestId },
      $expr: {
        $lt: [
          { $add: ["$successfulCount", "$reservedCount"] },
          TRY_ON_LIMIT,
        ],
      },
      $or: [
        { lastRequestAt: { $exists: false } },
        { lastRequestAt: { $lte: availableAfter } },
      ],
    },
    {
      $inc: { reservedCount: 1 },
      $addToSet: { reservedRequestIds: requestId },
      $set: { lastRequestAt: now },
    },
    { new: true },
  ).lean();

  if (reserved) return { type: "reserved", usage: reserved };

  const current = await TryOnUsage.findOne({ userId, usageDay }).lean();
  if (current?.completedRequestIds?.includes(requestId)) {
    return { type: "completed", usage: current };
  }
  if (current?.reservedRequestIds?.includes(requestId)) {
    return { type: "already-reserved", usage: current };
  }
  const currentAllowance = allowance(current);
  if (currentAllowance.remaining <= 0) return { type: "limit", usage: current };

  const lastRequestAt = current?.lastRequestAt ? new Date(current.lastRequestAt).getTime() : 0;
  if (lastRequestAt > Date.now() - RATE_LIMIT_MS) {
    return { type: "rate-limit", usage: current };
  }
  return { type: "unavailable", usage: current };
}

async function finalizeSuccess(userId, requestId, usageDay) {
  const result = await TryOnUsage.updateOne(
    {
      userId,
      usageDay,
      reservedRequestIds: requestId,
      successfulCount: { $lt: TRY_ON_LIMIT },
    },
    {
      $inc: { successfulCount: 1, reservedCount: -1 },
      $pull: { reservedRequestIds: requestId },
      $addToSet: { completedRequestIds: requestId },
    },
  );
  if (result.modifiedCount) return true;
  const usage = await TryOnUsage.findOne({ userId, usageDay }).select("completedRequestIds").lean();
  return Boolean(usage?.completedRequestIds?.includes(requestId));
}

async function releaseReservation(userId, requestId, usageDay) {
  await TryOnUsage.updateOne(
    { userId, usageDay, reservedRequestIds: requestId },
    {
      $inc: { reservedCount: -1 },
      $pull: { reservedRequestIds: requestId },
    },
  );
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
    PROVIDER_TIMEOUT: "The result is still being checked. This attempt is held safely while we confirm it.",
    PROVIDER_UNAVAILABLE: "The result is still being checked. This attempt is held safely while we confirm it.",
    TRY_ON_ERROR: "Virtual try-on is temporarily unavailable.",
  }[code] || "Virtual try-on is temporarily unavailable.";
}

function jobErrorResponse(job, remaining) {
  if (job.status === "rejected") {
    const limit = job.errorCode === "TRY_ON_LIMIT";
    return json(
      {
        status: "rejected",
        error: limit
          ? "You have used both of your available try-ons for today."
          : "Please wait a few seconds before starting another try-on.",
        ...remaining,
      },
      429,
      limit ? {} : { "Retry-After": "10" },
    );
  }
  if (job.status === "failed") {
    const status = job.errorCode === "PRODUCT_NOT_FOUND" ? 404 : 422;
    return json({ status: "failed", error: messageForCode(job.errorCode), ...remaining }, status);
  }
  return null;
}

async function resolveJob(userId, requestId) {
  let job = await TryOnJob.findOne({ userId, requestId }).lean();
  if (!job) return null;

  const usageDay = job.usageDay || getVirtualTryOnDayKey(job.createdAt || new Date());
  let usage = await TryOnUsage.findOne({ userId, usageDay }).lean();
  let requestIsComplete = usage?.completedRequestIds?.includes(requestId);
  let requestIsReserved = usage?.reservedRequestIds?.includes(requestId);
  let result = await TryOnResult.findOne({ userId, requestId }).lean();

  if (result && requestIsReserved) {
    await finalizeSuccess(userId, requestId, usageDay);
    usage = await TryOnUsage.findOne({ userId, usageDay }).lean();
    requestIsComplete = usage?.completedRequestIds?.includes(requestId);
    requestIsReserved = usage?.reservedRequestIds?.includes(requestId);
  }

  if (usage?.completedRequestIds?.includes(requestId) && job.status !== "succeeded") {
    await TryOnJob.updateOne({ userId, requestId }, { $set: { status: "succeeded", errorCode: "" } });
    job = { ...job, status: "succeeded", errorCode: "" };
  } else if (
    usage?.reservedRequestIds?.includes(requestId) &&
    job.status !== "uncertain" &&
    job.status !== "succeeded" &&
    job.status !== "failed" &&
    job.status !== "rejected" &&
    job.status !== "reserved"
  ) {
    await TryOnJob.updateOne({ userId, requestId }, { $set: { status: "reserved" } });
    job = { ...job, status: "reserved" };
  }

  if (job.status === "reserved" && !requestIsReserved && !requestIsComplete) {
    await TryOnJob.updateOne(
      { userId, requestId },
      { $set: { status: "failed", errorCode: "TRY_ON_ERROR" } },
    );
    job = { ...job, status: "failed", errorCode: "TRY_ON_ERROR" };
  }

  if (job.status === "succeeded") {
    result = await TryOnResult.findOne({ userId, requestId }).lean();
    return {
      response: result
        ? json({ status: "succeeded", result: result.imageData, ...(await getAllowance(userId)) })
        : json({ status: "succeeded", resultExpired: true, ...(await getAllowance(userId)) }),
      retryable: false,
    };
  }

  const currentAllowance = await getAllowance(userId);
  const terminalError = jobErrorResponse(job, currentAllowance);
  if (terminalError) return { response: terminalError, retryable: false };

  if (job.status === "uncertain") {
    return {
      response: json(
        {
          status: "uncertain",
          message: messageForCode(job.errorCode),
          ...currentAllowance,
        },
        202,
      ),
      retryable: false,
    };
  }
  if (job.status === "reserved" || requestIsReserved) {
    return {
      response: json(
        { status: "pending", message: "Generating your virtual try-on...", ...currentAllowance },
        202,
      ),
      retryable: false,
    };
  }
  return { response: null, retryable: job.status === "new" };
}

async function readBoundedBody(request) {
  if (!request.body) throw new VirtualTryOnError("Upload a photo to continue.", { status: 400, code: "INVALID_IMAGE" });
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

async function updateJob(userId, requestId, changes) {
  await TryOnJob.updateOne({ userId, requestId }, { $set: changes });
}

async function failBeforeGeneration(userId, requestId, error) {
  await updateJob(userId, requestId, { status: "failed", errorCode: error.code || "TRY_ON_ERROR" });
}

export async function GET(request) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) return json({ error: "Please log in to use virtual try-on." }, 401);
    await ensureStorage();
    const userId = objectId(user);
    const requestId = new URL(request.url).searchParams.get("requestId");

    if (requestId) {
      if (!validRequestId(requestId)) return json({ error: "Invalid request ID." }, 400);
      const resolved = await resolveJob(userId, requestId);
      if (!resolved) return json({ error: "Try-on request not found." }, 404);
      return resolved.response || json({ status: "not_started", ...(await getAllowance(userId)) }, 200);
    }

    return json(await getAllowance(userId), 200);
  } catch {
    return json({ error: "Virtual try-on is temporarily unavailable." }, 503);
  }
}

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "This request is not allowed." }, 403);
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("multipart/form-data")) {
    return json({ error: "Send your photo as multipart form data." }, 400);
  }

  const requestId = request.headers.get("idempotency-key") || "";
  const productId = request.headers.get("x-product-id") || "";
  if (!validRequestId(requestId)) return json({ error: "A valid idempotency key is required." }, 400);
  if (!validProductId(productId)) return json({ error: "Choose a valid product." }, 400);

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return json({ error: "Photo must be 5 MB or smaller." }, 413);
  }

  let user;
  let userId;
  let usageDay;
  let reservationMade = false;
  let providerStarted = false;
  let providerRespondedSuccessfully = false;
  let job;
  try {
    user = await getCurrentUser();
    if (!user) return json({ error: "Please log in to use virtual try-on." }, 401);
    await ensureStorage();
    userId = objectId(user);
    const requestDay = getVirtualTryOnDayKey();

    const existing = await TryOnJob.findOne({ userId, requestId }).lean();
    if (existing && existing.productId !== productId) {
      return json({ error: "This request ID is already linked to a different product." }, 409);
    }
    if (existing) {
      usageDay = existing.usageDay || getVirtualTryOnDayKey(existing.createdAt || new Date());
      if (!existing.usageDay) {
        await updateJob(userId, requestId, { usageDay });
      }
      const resolved = await resolveJob(userId, requestId);
      if (resolved && !resolved.retryable) return resolved.response;
      job = { ...existing, usageDay };
    } else {
      usageDay = requestDay;
      try {
        job = await TryOnJob.create({ userId, requestId, productId, usageDay, status: "new" });
      } catch (error) {
        if (error?.code !== 11000) throw error;
        const duplicate = await TryOnJob.findOne({ userId, requestId }).lean();
        if (!duplicate || duplicate.productId !== productId) {
          return json({ error: "This request ID is already in use." }, 409);
        }
        usageDay = duplicate.usageDay || getVirtualTryOnDayKey(duplicate.createdAt || new Date());
        if (!duplicate.usageDay) {
          await updateJob(userId, requestId, { usageDay });
        }
        const resolved = await resolveJob(userId, requestId);
        if (resolved && !resolved.retryable) return resolved.response;
        job = { ...duplicate, usageDay };
      }
    }

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
      const error = new VirtualTryOnError("Send your photo as multipart form data.", {
        status: 400,
        code: "INVALID_IMAGE",
      });
      await failBeforeGeneration(userId, requestId, error);
      return json({ error: messageForCode(error.code), status: "failed", ...(await getAllowance(userId)) }, error.status);
    }

    const submittedProductId = String(formData.get("productId") || "");
    const photo = formData.get("photo");
    if (submittedProductId !== productId) {
      const error = new VirtualTryOnError("Choose a valid product.", { status: 400, code: "PRODUCT_NOT_FOUND" });
      await failBeforeGeneration(userId, requestId, error);
      return json({ error: messageForCode(error.code), status: "failed", ...(await getAllowance(userId)) }, error.status);
    }
    if (!photo || typeof photo.arrayBuffer !== "function" || !photo.size) {
      const error = new VirtualTryOnError("Upload a photo to continue.", { status: 400, code: "INVALID_IMAGE" });
      await failBeforeGeneration(userId, requestId, error);
      return json({ error: messageForCode(error.code), status: "failed", ...(await getAllowance(userId)) }, error.status);
    }
    if (photo.size > MAX_FACE_IMAGE_BYTES) {
      const error = new VirtualTryOnError("Photo must be 5 MB or smaller.", { status: 413, code: "IMAGE_TOO_LARGE" });
      await failBeforeGeneration(userId, requestId, error);
      return json({ error: error.message, status: "failed", ...(await getAllowance(userId)) }, error.status);
    }
    if (!ALLOWED_FILE_TYPES.has(photo.type)) {
      const error = new VirtualTryOnError("Use a JPG, PNG, or WebP image.", { status: 400, code: "INVALID_IMAGE" });
      await failBeforeGeneration(userId, requestId, error);
      return json({ error: error.message, status: "failed", ...(await getAllowance(userId)) }, error.status);
    }

    const faceBuffer = await normalizeTryOnImage(Buffer.from(await photo.arrayBuffer()));
    assertVirtualTryOnConfigured();

    const product = await Product.findOne({ id: productId })
      .select("id name tryOnImage image")
      .lean();
    if (!product) {
      const error = new VirtualTryOnError("This product is no longer available.", {
        status: 404,
        code: "PRODUCT_NOT_FOUND",
      });
      await failBeforeGeneration(userId, requestId, error);
      return json({ error: messageForCode(error.code), status: "failed", ...(await getAllowance(userId)) }, 404);
    }
    const productImageUrl = product.tryOnImage || product.image;
    if (!productImageUrl) {
      const error = new VirtualTryOnError("The product image is not available for virtual try-on.", {
        status: 422,
        code: "PRODUCT_IMAGE_UNAVAILABLE",
      });
      await failBeforeGeneration(userId, requestId, error);
      return json({ error: messageForCode(error.code), status: "failed", ...(await getAllowance(userId)) }, 422);
    }
    const productBuffer = await loadProductTryOnImage(productImageUrl);

    const reservation = await reserveAttempt(userId, requestId, usageDay);
    if (reservation.type === "already-reserved" || reservation.type === "completed") {
      await updateJob(userId, requestId, {
        status: reservation.type === "completed" ? "succeeded" : "reserved",
      });
      const resolved = await resolveJob(userId, requestId);
      return resolved?.response || json({ status: "pending", ...(await getAllowance(userId)) }, 202);
    }
    if (reservation.type === "limit") {
      await updateJob(userId, requestId, { status: "rejected", errorCode: "TRY_ON_LIMIT" });
      return jobErrorResponse(
        { status: "rejected", errorCode: "TRY_ON_LIMIT" },
        allowance(reservation.usage),
      );
    }
    if (reservation.type === "rate-limit") {
      await updateJob(userId, requestId, { status: "rejected", errorCode: "TRY_ON_RATE_LIMIT" });
      return jobErrorResponse(
        { status: "rejected", errorCode: "TRY_ON_RATE_LIMIT" },
        allowance(reservation.usage),
      );
    }
    if (reservation.type !== "reserved") {
      await updateJob(userId, requestId, { status: "failed", errorCode: "TRY_ON_ERROR" });
      return json({ status: "failed", error: messageForCode("TRY_ON_ERROR"), ...(await getAllowance(userId)) }, 503);
    }
    reservationMade = true;
    await updateJob(userId, requestId, { status: "reserved", errorCode: "" });

    providerStarted = true;
    const generated = await generateVirtualTryOn(productBuffer, faceBuffer);
    providerRespondedSuccessfully = true;
    const imageData = "data:image/webp;base64," + generated.buffer.toString("base64");
    await TryOnResult.create({
      userId,
      requestId,
      imageData,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const finalized = await finalizeSuccess(userId, requestId, usageDay);
    if (!finalized) {
      await updateJob(userId, requestId, { status: "uncertain", errorCode: "TRY_ON_ERROR" });
      return json(
        {
          status: "uncertain",
          message: messageForCode("TRY_ON_ERROR"),
          ...(await getAllowance(userId)),
        },
        202,
      );
    }
    await updateJob(userId, requestId, { status: "succeeded", errorCode: "" });
    return json({ status: "succeeded", result: imageData, ...(await getAllowance(userId)) }, 200);
  } catch (error) {
    if (userId && job && reservationMade) {
      if (error?.outcomeUnknown || providerRespondedSuccessfully || (providerStarted && !(error instanceof VirtualTryOnError))) {
        await updateJob(userId, requestId, {
          status: "uncertain",
          errorCode: error?.code || "PROVIDER_UNAVAILABLE",
        }).catch(() => {});
        return json(
          {
            status: "uncertain",
            message: messageForCode(error?.code),
            ...(await getAllowance(userId).catch(() => allowance(null))),
          },
          202,
        );
      }

      await releaseReservation(userId, requestId, usageDay).catch(() => {});
      await updateJob(userId, requestId, {
        status: "failed",
        errorCode: error?.code || "TRY_ON_ERROR",
      }).catch(() => {});
      return json(
        {
          status: "failed",
          error: messageForCode(error?.code),
          ...(await getAllowance(userId).catch(() => allowance(null))),
        },
        error?.status || 502,
      );
    }

    if (userId && job && error instanceof VirtualTryOnError) {
      await failBeforeGeneration(userId, requestId, error).catch(() => {});
      return json(
        { status: "failed", error: error.message, ...(await getAllowance(userId).catch(() => allowance(null))) },
        error.status,
      );
    }

    return json({ error: "Virtual try-on is temporarily unavailable." }, 503);
  }
}