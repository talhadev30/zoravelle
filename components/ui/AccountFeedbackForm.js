"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export default function AccountFeedbackForm({ userName }) {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submitFeedback(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, message: message.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit feedback.");
      setMessage("");
      setRating(5);
      setSuccess("Thank you. Your feedback is submitted for review. An admin may select it to appear on the homepage.");
    } catch (submissionError) {
      setError(submissionError.message || "Could not submit feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-10 rounded-3xl border border-black/10 bg-white/60 p-5 sm:p-7" aria-labelledby="account-feedback-heading">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-black/50">Your voice matters</p>
        <h2 id="account-feedback-heading" className="mt-2 font-space text-2xl">Share feedback</h2>
        <p className="mt-1 text-sm text-black/55">Submitting as {userName}. Our team reviews feedback before featuring it.</p>
      </div>
      <form onSubmit={submitFeedback} className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium">Your rating</p>
          <div className="flex h-11 items-center gap-1" role="group" aria-label="Choose a rating from 1 to 5 stars">
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
        <label className="block text-sm font-medium sm:col-span-2">
          Your feedback
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            minLength={10}
            maxLength={1000}
            required
            placeholder="Tell us about your experience."
            className="mt-2 w-full resize-y rounded-xl border border-black/15 bg-white p-3 text-sm font-normal outline-none focus:border-black"
          />
          <span className="mt-1 block text-right text-xs font-normal text-black/45">{message.length}/1000</span>
        </label>
        {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
        {success && <p role="status" className="text-sm text-emerald-700 sm:col-span-2">{success}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-fit rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Send feedback"}
        </button>
      </form>
    </section>
  );
}