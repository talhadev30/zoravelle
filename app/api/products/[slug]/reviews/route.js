import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Product, ProductReview } from "@/lib/models";
import { isSameOriginRequest } from "@/lib/security";

function errorResponse(message, status) {
  return Response.json({ error: message }, { status });
}

async function getReviewSummary(productId) {
  const [result] = await ProductReview.aggregate([
    { $match: { productId } },
    {
      $group: {
        _id: null,
        rating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);
  return {
    rating: result ? Number(result.rating.toFixed(1)) : 0,
    count: result?.count || 0,
  };
}

export async function GET(_request, context) {
  try {
    const { slug } = await context.params;
    const productId = String(slug || "");
    if (!productId || productId.length > 80) return errorResponse("Product not found.", 404);

    await connectDB();
    if (!(await Product.exists({ id: productId }))) return errorResponse("Product not found.", 404);

    const user = await getCurrentUser();
    const [reviews, summary, existingReview] = await Promise.all([
      ProductReview.find({ productId })
        .sort({ createdAt: -1 })
        .limit(100)
        .select("userId userName userImage rating comment createdAt")
        .populate("userId", "avatarUrl")
        .lean(),
      getReviewSummary(productId),
      user ? ProductReview.exists({ productId, userId: user.id }) : Promise.resolve(false),
    ]);

    return Response.json({
      reviews: reviews.map((review) => ({
        id: String(review._id),
        userName: review.userName,
        userImage: review.userImage || review.userId?.avatarUrl || "",
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      })),
      summary,
      canReview: Boolean(user),
      hasReviewed: Boolean(existingReview),
    });
  } catch (error) {
    console.error("[reviews] GET failed:", error);
    return errorResponse("Reviews are unavailable right now.", 503);
  }
}

export async function POST(request, context) {
  if (!isSameOriginRequest(request)) return errorResponse("This request is not allowed.", 403);
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("[reviews] account check failed:", error);
    return errorResponse("Could not verify your account.", 503);
  }
  if (!user) return errorResponse("Log in to write a review.", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Send a valid review.", 400);
  }
  const reviewBody = body && typeof body === "object" ? body : {};
  const rating = Number(reviewBody.rating);
  const comment = String(reviewBody.comment || "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return errorResponse("Choose a rating from 1 to 5 stars.", 400);
  }
  if (comment.length < 10 || comment.length > 1200) {
    return errorResponse("Write a review between 10 and 1200 characters.", 400);
  }

  try {
    const { slug } = await context.params;
    const productId = String(slug || "");
    if (!productId || productId.length > 80) return errorResponse("Product not found.", 404);

    await connectDB();
    const product = await Product.findOne({ id: productId }).select("id rating reviews").lean();
    if (!product) return errorResponse("Product not found.", 404);

    const review = await ProductReview.create({
      productId,
      userId: user.id,
      userName: String(user.name || "Customer").trim().slice(0, 80) || "Customer",
      userImage: user.avatarUrl || "",
      rating,
      comment,
    });

    let summary = {
      count: (Number(product.reviews) || 0) + 1,
      rating: Number((((Number(product.rating) || 0) * (Number(product.reviews) || 0) + rating) / ((Number(product.reviews) || 0) + 1)).toFixed(1)),
    };
    try {
      summary = await getReviewSummary(productId);
      await Product.updateOne({ id: productId }, { $set: { rating: summary.rating, reviews: summary.count } });
    } catch (summaryError) {
      console.error("[reviews] rating summary update failed:", summaryError);
    }

    return Response.json({
      review: {
        id: String(review._id),
        userName: review.userName,
        userImage: review.userImage || review.userId?.avatarUrl || "",
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      },
      summary,
      hasReviewed: true,
    }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return errorResponse("You have already reviewed this product.", 409);
    console.error("[reviews] POST failed:", error);
    return errorResponse("Could not save your review right now.", 503);
  }
}