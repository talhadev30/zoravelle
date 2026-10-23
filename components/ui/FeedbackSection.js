"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { EASING, defaultViewport } from "@/lib/animations";

function StarDisplay({ value }) {
  const roundedValue = Math.round(Number(value) || 0);
  return (
    <div className="flex items-center gap-1" role="img" aria-label={(Number(value) || 0) + " out of 5 stars"}>
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

function FeedbackAvatar({ image, name }) {
  const initial = String(name || "C").trim().slice(0, 1).toUpperCase();
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-black/5 text-sm font-medium text-black/60">
      {image ? <Image src={image} alt="" width={40} height={40} className="h-full w-full object-cover" /> : initial}
    </div>
  );
}

export default function FeedbackSection() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const shouldReduce = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: EASING.luxury,
      },
    },
  };

  useEffect(() => {
    let active = true;
    async function loadFeedback() {
      try {
        const response = await fetch("/api/feedback", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load feedback.");
        if (active) setFeedback(Array.isArray(data.feedback) ? data.feedback : []);
      } catch {
        if (active) {
          setFeedback([]);
          setError("Customer feedback is temporarily unavailable.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadFeedback();
    return () => {
      active = false;
    };
  }, []);

  if (loading || (feedback.length === 0 && !error)) return null;

  return (
    <section className="bg-[#f6f3ed] px-5 py-14 sm:px-8 md:py-20 lg:px-12" aria-labelledby="customer-feedback-heading">
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={shouldReduce ? undefined : itemVariants}
          className="mb-8 max-w-2xl"
        >
          <p className="text-xs uppercase tracking-[0.18em] text-black/50">From our community</p>
          <h2 id="customer-feedback-heading" className="mt-2 font-space text-3xl sm:text-4xl">
            Customer feedback
          </h2>
          <p className="mt-3 text-sm text-black/60">
            A few words from the Zoravelle community.
          </p>
        </motion.div>

        {error && feedback.length === 0 ? (
          <p role="status" className="rounded-2xl border border-black/10 bg-white/75 p-5 text-sm text-black/60">
            {error}
          </p>
        ) : (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            variants={shouldReduce ? undefined : containerVariants}
            className="grid gap-4 md:grid-cols-3"
          >
            {feedback.slice(0, 3).map((entry) => (
              <motion.article
                key={entry.id}
                variants={shouldReduce ? undefined : itemVariants}
                whileHover={shouldReduce ? undefined : { y: -4, transition: { duration: 0.25, ease: EASING.luxury } }}
                className="rounded-2xl border border-black/10 bg-white/75 p-5 sm:p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <StarDisplay value={entry.rating} />
                <blockquote className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-black/75">
                  &ldquo;{entry.message}&rdquo;
                </blockquote>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <FeedbackAvatar image={entry.userImage} name={entry.name} />
                    <p className="truncate font-medium">{entry.name}</p>
                  </div>
                  <time className="text-xs text-black/45" dateTime={entry.createdAt}>
                    {formatDate(entry.createdAt)}
                  </time>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
