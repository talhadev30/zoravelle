"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";

function StarDisplay({ value }) {
  const roundedValue = Math.round(Number(value) || 0);
  return (
    <div className="flex items-center gap-1" role="img" aria-label={(Number(value) || 0).toFixed(1) + " out of 5 stars"}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={"h-4 w-4 " + (index < roundedValue ? "fill-amber-400 text-amber-500" : "text-black/20")}
        />
      ))}
    </div>
  );
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function ReviewerAvatar({ image, name }) {
  const initial = String(name || "C").trim().slice(0, 1).toUpperCase();
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-black/5 text-sm font-medium text-black/60">
      {image ? <Image src={image} alt="" width={40} height={40} className="h-full w-full object-cover" /> : initial}
    </div>
  );
}
export default function ProductReviews({ productId, onSummaryChange }) {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ rating: 0, count: 0 });
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReviews() {
      try {
        const response = await fetch(
          "/api/products/" + encodeURIComponent(productId) + "/reviews",
          { cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load reviews.");
        if (!active) return;
        const nextSummary = {
          rating: Number(data.summary?.rating) || 0,
          count: Number(data.summary?.count) || 0,
        };
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setSummary(nextSummary);
        setCanReview(Boolean(data.canReview));
        setHasReviewed(Boolean(data.hasReviewed));
        onSummaryChange?.(nextSummary);
      } catch (loadFailure) {
        if (active) setLoadError(loadFailure.message || "Could not load reviews.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReviews();
    return () => {
      active = false;
    };
  }, [productId, onSummaryChange]);

  async function submitReview(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const cleanedComment = comment.trim();
    if (cleanedComment.length < 10 || cleanedComment.length > 1200) {
      setError("Write a review between 10 and 1200 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        "/api/products/" + encodeURIComponent(productId) + "/reviews",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, comment: cleanedComment }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) setHasReviewed(true);
        throw new Error(data.error || "Could not submit your review.");
      }

      setReviews((current) => [data.review, ...current.filter((item) => item.id !== data.review.id)]);
      const nextSummary = {
        rating: Number(data.summary?.rating) || 0,
        count: Number(data.summary?.count) || 0,
      };
      setSummary(nextSummary);
      setHasReviewed(true);
      setComment("");
      setSuccess("Thanks for sharing your review.");
      onSummaryChange?.(nextSummary);
    } catch (submissionFailure) {
      setError(submissionFailure.message || "Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/60 p-4">
        <div>
          <p className="font-medium">
            {summary.count ? summary.rating.toFixed(1) + " out of 5" : "No reviews yet"}
          </p>
          <p className="mt-1 text-sm text-black/55">
            {summary.count} {summary.count === 1 ? "review" : "reviews"}
          </p>
        </div>
        <StarDisplay value={summary.rating} />
      </div>

      {loadError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{loadError}</p>}
      {loading && <p className="text-sm text-black/55">Loading reviews...</p>}

      {!loading && !loadError && canReview && !hasReviewed && (
        <form onSubmit={submitReview} className="space-y-4 rounded-2xl border border-black/10 bg-white/60 p-4 sm:p-5">
          <div>
            <h3 className="font-medium">Write a review</h3>
            <p className="mt-1 text-sm text-black/55">Share your experience with this product.</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Your rating</p>
            <div className="flex gap-1" role="group" aria-label="Choose a rating from 1 to 5 stars">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;
                const selected = value <= rating;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={"Rate " + value + (value === 1 ? " star" : " stars")}
                    aria-pressed={rating === value}
                    onClick={() => setRating(value)}
                    className="rounded-md p-1 transition hover:scale-110"
                  >
                    <Star aria-hidden="true" className={"h-6 w-6 " + (selected ? "fill-amber-400 text-amber-500" : "text-black/25")} />
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block text-sm font-medium">
            Your review
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              minLength={10}
              maxLength={1200}
              required
              placeholder="What did you like about this product?"
              className="mt-2 w-full resize-y rounded-xl border border-black/15 bg-white p-3 text-sm font-normal outline-none focus:border-black"
            />
            <span className="mt-1 block text-right text-xs font-normal text-black/45">{comment.length}/1200</span>
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {success && <p role="status" className="text-sm text-emerald-700">{success}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit review"}
          </button>
        </form>
      )}

      {!loading && !loadError && !canReview && (
        <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
          <p className="text-sm">Log in to write a review.</p>
          <Link
            href={"/login?next=" + encodeURIComponent("/shop/" + productId)}
            className="mt-2 inline-block text-sm font-medium underline underline-offset-4"
          >
            Log in
          </Link>
        </div>
      )}

      {!loading && !loadError && hasReviewed && (
        <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          You have already reviewed this product. Thank you!
        </p>
      )}

      {!loading && !loadError && reviews.length === 0 && (
        <p className="rounded-2xl border border-dashed border-black/15 p-5 text-center text-sm text-black/55">
          Be the first to review this product.
        </p>
      )}

      {reviews.map((review) => (
        <article key={review.id} className="rounded-2xl border border-black/10 bg-white/60 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <ReviewerAvatar image={review.userImage} name={review.userName} />
              <div>
                <p className="font-medium">{review.userName}</p>
                <time className="mt-1 block text-xs text-black/50" dateTime={review.createdAt}>
                  {formatDate(review.createdAt)}
                </time>
              </div>
            </div>
            <StarDisplay value={review.rating} />
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{review.comment}</p>
        </article>
      ))}
    </section>
  );
}