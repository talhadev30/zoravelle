"use client";

import { useState } from "react";

const fieldClass =
  "mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10";

export default function ContactForm() {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setSending(true);
    setStatus({ type: "", message: "" });

    try {
      const formData = new FormData(form);
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "We could not send your message. Please try again.");
      }

      form.reset();
      setStatus({ type: "success", message: "Thanks for reaching out. Your message has been sent." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "We could not send your message. Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">
        Your name
        <input name="name" type="text" autoComplete="name" maxLength={100} required className={fieldClass} />
      </label>
      <label className="text-sm font-medium">
        Email address
        <input name="email" type="email" autoComplete="email" maxLength={254} required className={fieldClass} />
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        Subject
        <input name="topic" type="text" maxLength={120} required className={fieldClass} />
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        Message
        <textarea name="message" rows={6} maxLength={5000} required className={fieldClass} />
      </label>
      <div className="hidden" aria-hidden="true">
        <label>
          Leave this field blank
          <input name="botcheck" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex flex-col items-start gap-3 sm:col-span-2">
        {status.message ? (
          <p
            role={status.type === "error" ? "alert" : "status"}
            className={status.type === "error" ? "text-sm text-red-700" : "text-sm text-green-800"}
          >
            {status.message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-black px-6 py-3 text-sm text-white disabled:cursor-wait disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send message"}
        </button>
      </div>
    </form>
  );
}