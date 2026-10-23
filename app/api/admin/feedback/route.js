import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { SiteFeedback } from "@/lib/models";
import { isSameOriginRequest } from "@/lib/security";

function denied() {
  return Response.json({ error: "Admin access required." }, { status: 401 });
}

function serializeFeedback(entry) {
  return {
    id: String(entry._id),
    name: entry.name,
    rating: entry.rating,
    message: entry.message,
    createdAt: entry.createdAt,
    featured: entry.featured === true,
    featuredOrder: entry.featured === true ? entry.featuredOrder : null,
  };
}

export async function GET() {
  if (!(await requireAdmin())) return denied();
  try {
    await connectDB();
    const entries = await SiteFeedback.find({})
      .sort({ featured: -1, featuredOrder: 1, createdAt: -1 })
      .limit(500)
      .select("name rating message createdAt featured featuredOrder")
      .lean();
    return Response.json({ feedback: entries.map(serializeFeedback) });
  } catch (error) {
    console.error("[admin feedback] GET failed:", error);
    return Response.json({ error: "Feedback is unavailable." }, { status: 503 });
  }
}

export async function PUT(request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  if (!(await requireAdmin())) return denied();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send valid feedback selections." }, { status: 400 });
  }

  const ids = body && Array.isArray(body.feedbackIds) ? body.feedbackIds : null;
  if (
    !ids ||
    ids.length > 3 ||
    ids.some((id) => typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) ||
    new Set(ids).size !== ids.length
  ) {
    return Response.json({ error: "Choose up to three valid feedback entries." }, { status: 400 });
  }

  try {
    await connectDB();
    const entries = ids.length ? await SiteFeedback.find({ _id: { $in: ids } }).select("_id").lean() : [];
    if (entries.length !== ids.length) {
      return Response.json({ error: "One or more feedback entries could not be found." }, { status: 404 });
    }

    await SiteFeedback.updateMany({}, { $set: { featured: false, featuredOrder: null } });
    if (ids.length) {
      await SiteFeedback.bulkWrite(
        ids.map((id, index) => ({
          updateOne: {
            filter: { _id: id },
            update: { $set: { featured: true, featuredOrder: index } },
          },
        }))
      );
    }

    return Response.json({ ok: true, featuredIds: ids });
  } catch (error) {
    console.error("[admin feedback] PUT failed:", error);
    return Response.json({ error: "Could not save homepage feedback." }, { status: 503 });
  }
}