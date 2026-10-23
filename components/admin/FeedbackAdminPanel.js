"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export default function FeedbackAdminPanel() {
  const [feedback, setFeedback] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function loadFeedback() {
      try {
        const response = await fetch("/api/admin/feedback", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load feedback.");
        const entries = Array.isArray(data.feedback) ? data.feedback : [];
        if (!active) return;
        setFeedback(entries);
        setSelectedIds(entries.filter((entry) => entry.featured).sort((a, b) => a.featuredOrder - b.featuredOrder).map((entry) => entry.id));
      } catch (error) {
        if (active) setNotice(error.message || "Could not load feedback.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadFeedback();
    return () => {
      active = false;
    };
  }, []);

  function toggleFeedback(id) {
    setNotice("");
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
      return;
    }
    if (selectedIds.length >= 3) {
      setNotice("Choose up to three feedback entries.");
      return;
    }
    setSelectedIds([...selectedIds, id]);
  }

  async function saveSelection() {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackIds: selectedIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save homepage feedback.");
      setFeedback((entries) => entries.map((entry) => {
        const order = selectedIds.indexOf(entry.id);
        return { ...entry, featured: order !== -1, featuredOrder: order === -1 ? null : order };
      }));
      setNotice("Homepage feedback selection saved.");
    } catch (error) {
      setNotice(error.message || "Could not save homepage feedback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-space text-2xl">Homepage feedback</h2>
          <p className="mt-1 text-sm text-black/55">Select up to three entries and choose their display order.</p>
        </div>
        <button
          type="button"
          onClick={saveSelection}
          disabled={loading || saving}
          className="rounded-full bg-black px-5 py-2.5 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save selection"}
        </button>
      </div>
      {notice && <p role="status" className="mb-4 rounded-xl bg-black/5 px-4 py-3 text-sm">{notice}</p>}
      {loading ? (
        <p className="rounded-2xl bg-white/60 p-8 text-center text-sm text-black/55">Loading feedback...</p>
      ) : feedback.length ? (
        <div className="grid gap-3">
          {feedback.map((entry) => {
            const order = selectedIds.indexOf(entry.id);
            return (
              <label key={entry.id} className="flex cursor-pointer gap-4 rounded-2xl border border-black/10 bg-white/60 p-4">
                <input
                  type="checkbox"
                  checked={order !== -1}
                  disabled={order === -1 && selectedIds.length >= 3}
                  onChange={() => toggleFeedback(entry.id)}
                  className="mt-1 h-4 w-4 accent-black"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{entry.name}</strong>
                    {order !== -1 && <span className="rounded-full bg-black px-2.5 py-1 text-xs text-white">Homepage #{order + 1}</span>}
                    <span className="text-xs text-black/45">{formatDate(entry.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1" aria-label={entry.rating + " out of 5 stars"}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star key={index} aria-hidden="true" className={"h-4 w-4 " + (index < entry.rating ? "fill-amber-400 text-amber-500" : "text-black/20")} />
                    ))}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-black/70">{entry.message}</p>
                </div>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl bg-white/60 p-8 text-center text-sm text-black/55">No feedback submissions yet.</p>
      )}
    </section>
  );
}