import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { SiteFeedback } from "@/lib/models";
import { isSameOriginRequest } from "@/lib/security";

function errorResponse(message, status) {
  return Response.json({ error: message }, { status });
}

function serializeFeedback(entry) {
  return {
    id: String(entry._id),
    name: entry.name,
    userImage: entry.userImage || entry.userId?.avatarUrl || "",
    rating: entry.rating,
    message: entry.message,
    createdAt: entry.createdAt,
  };
}

export async function GET() {
  try {
    await connectDB();
    const entries = await SiteFeedback.find({ featured: true })
      .sort({ featuredOrder: 1, createdAt: -1 })
      .limit(3)
      .select("name userImage userId rating message createdAt")
      .populate("userId", "avatarUrl")
      .lean();
    return Response.json({ feedback: entries.map(serializeFeedback) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[feedback] GET failed:", error);
    return errorResponse("Feedback is unavailable right now.", 503);
  }
}

export async function POST(request) {
  if (!isSameOriginRequest(request)) return errorResponse("This request is not allowed.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Send valid feedback.", 400);
  }

  const submitted = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const rating = Number(submitted.rating);
  const message = String(submitted.message || "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return errorResponse("Choose a rating from 1 to 5 stars.", 400);
  }
  if (message.length < 10 || message.length > 1000) {
    return errorResponse("Write feedback between 10 and 1000 characters.", 400);
  }

  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Sign in to submit feedback.", 401);
    await connectDB();
    const entry = await SiteFeedback.create({
      name: user.name,
      userId: user.id,
      userImage: user.avatarUrl || "",
      rating,
      message,
      featured: false,
      featuredOrder: null,
    });
    return Response.json({ feedback: serializeFeedback(entry) }, { status: 201 });
  } catch (error) {
    console.error("[feedback] POST failed:", error);
    return errorResponse("Could not save feedback right now.", 503);
  }
}