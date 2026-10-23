"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, RefreshCw, Upload, X } from "lucide-react";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PENDING_KEY = "zv-try-on-pending";

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function VirtualTryOnModal({ product, onClose }) {
  const [usage, setUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [consented, setConsented] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [result, setResult] = useState("");
  const [resultExpired, setResultExpired] = useState(false);
  const [error, setError] = useState("");
  const objectUrlRef = useRef("");
  const fileInputRef = useRef(null);

  const loadAllowance = useCallback(async () => {
    setUsageLoading(true);
    try {
      const response = await fetch("/api/try-on", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) {
        setAuthRequired(true);
        setUsage(null);
        return;
      }
      if (!response.ok) throw new Error(data.error || "Could not load try-on availability.");
      setAuthRequired(false);
      setUsage(data);
    } catch (loadError) {
      setError(loadError.message || "Could not load try-on availability.");
    } finally {
      setUsageLoading(false);
    }
  }, []);

  const acceptStatus = useCallback((data) => {
    if (data.remaining !== undefined) {
      setUsage({
        limit: data.limit ?? 2,
        successfulCount: data.successfulCount ?? 0,
        reservedCount: data.reservedCount ?? 0,
        remaining: data.remaining,
      });
    }
    if (data.status === "succeeded") {
      setGenerating(false);
      setUncertain(false);
      setError("");
      setResultExpired(Boolean(data.resultExpired));
      setResult(data.result || "");
      return "done";
    }
    if (data.status === "failed" || data.status === "rejected") {
      setGenerating(false);
      setUncertain(false);
      setResult("");
      setError(data.error || "Try-on generation failed. Please try again.");
      try {
        sessionStorage.removeItem(PENDING_KEY);
      } catch {}
      return "done";
    }
    if (data.status === "not_started") {
      setGenerating(false);
      setUncertain(false);
      setError("This request did not start. Upload your photo again to try.");
      try {
        sessionStorage.removeItem(PENDING_KEY);
      } catch {}
      return "done";
    }
    if (data.status === "uncertain") {
      setUncertain(true);
      setError(data.message || "We are still checking this try-on request.");
      return "uncertain";
    }
    return "pending";
  }, []);

  const pollStatus = useCallback(async (id, attempts = 24) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await fetch(
          "/api/try-on?requestId=" + encodeURIComponent(id),
          { cache: "no-store" },
        );
        const data = await response.json();
        if (response.status === 401) {
          setAuthRequired(true);
          setGenerating(false);
          setError(data.error || "Please log in to use virtual try-on.");
          return;
        }
        const state = acceptStatus(data);
        if (state === "done") return;
        if (state === "uncertain" && attempt >= 2) {
          setGenerating(false);
          return;
        }
        if (response.status === 404) {
          setGenerating(false);
          setUncertain(false);
          setError(data.error || "Try-on request was not found.");
          return;
        }
      } catch {
        // Keep checking the same idempotent request after a brief network interruption.
      }
      await delay(1500);
    }
    setGenerating(false);
    setUncertain(true);
    setError("This try-on is still being checked. Check its status again shortly.");
  }, [acceptStatus]);

  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      loadAllowance();
      try {
        const saved = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
        if (saved?.productId === product.id && saved?.requestId) {
          setRequestId(saved.requestId);
          setGenerating(true);
          pollStatus(saved.requestId, 5);
        }
      } catch {}
    }, 0);

    return () => {
      window.clearTimeout(initTimer);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [loadAllowance, pollStatus, product.id]);

  function choosePhoto(file) {
    setError("");
    setResult("");
    setResultExpired(false);
    setUncertain(false);
    if (!file) return;
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Photo must be 5 MB or smaller.");
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    setPreview(objectUrlRef.current);
    setPhoto(file);
  }

  function removePhoto() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
    setPhoto(null);
    setPreview("");
    setError("");
  }

  function clearRequest() {
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch {}
    setRequestId("");
    setUncertain(false);
  }
  async function generate() {
    if (!photo || !consented || generating) return;
    setGenerating(true);
    setUncertain(false);
    setResult("");
    setResultExpired(false);
    setError("");
    const id = crypto.randomUUID();
    setRequestId(id);
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ requestId: id, productId: product.id }));
    } catch {}

    const formData = new FormData();
    formData.append("productId", product.id);
    formData.append("photo", photo);
    try {
      const response = await fetch("/api/try-on", {
        method: "POST",
        headers: {
          "Idempotency-Key": id,
          "X-Product-Id": product.id,
        },
        body: formData,
      });
      const data = await response.json();
      if (response.status === 401) {
        setAuthRequired(true);
        setGenerating(false);
        setError(data.error || "Please log in to use virtual try-on.");
        return;
      }
      if (data.status === "succeeded" || data.status === "failed" || data.status === "rejected") {
        acceptStatus(data);
        return;
      }
      if (data.remaining !== undefined) {
        setUsage({
          limit: data.limit ?? 2,
          successfulCount: data.successfulCount ?? 0,
          reservedCount: data.reservedCount ?? 0,
          remaining: data.remaining,
        });
      }
      if (!response.ok && response.status !== 202) {
        setGenerating(false);
        setError(data.error || "Could not generate a try-on preview.");
        try {
          sessionStorage.removeItem(PENDING_KEY);
        } catch {}
        return;
      }
      if (data.status === "uncertain") setUncertain(true);
      await pollStatus(id, data.status === "uncertain" ? 3 : 24);
    } catch {
      setError("Connection interrupted. Checking the same try-on request...");
      await pollStatus(id, 24);
    }
  }

  const remaining = usage?.remaining ?? 0;
  const exhausted = usage && remaining <= 0;
  const detailHref = "/shop/" + encodeURIComponent(product.id);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="try-on-title"
        className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[#f6f3ed] p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-black/50">Zoravelle virtual try-on</p>
            <h2 id="try-on-title" className="mt-1 font-space text-3xl">Try on {product.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close virtual try-on" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/15">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-black/10 bg-white/60 p-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f1ece4]">
            <Image src={product.image} alt={product.name} fill unoptimized sizes="64px" className="object-contain p-2" />
          </div>
          <div>
            <p className="font-medium">{product.name}</p>
            <Link href={detailHref} onClick={onClose} className="text-xs text-black/55 underline underline-offset-4">Return to product</Link>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-white/60 px-4 py-3 text-sm" aria-live="polite">
          {usageLoading ? "Checking your try-on allowance..." : authRequired ? "Log in to see your available try-ons." : usage ? remaining + " of 2 try-ons remaining today" : "Try-on availability is temporarily unavailable."}
        </div>

        {authRequired ? (
          <div className="mt-5 rounded-2xl bg-white/60 p-5">
            <p className="text-sm">Sign in to generate and save up to two try-on results per day to your account.</p>
            <Link href={"/login?next=" + encodeURIComponent(detailHref)} onClick={onClose} className="mt-4 inline-flex rounded-full bg-black px-5 py-3 text-sm font-medium text-white">Log in</Link>
          </div>
        ) : result ? (
          <div className="mt-5">
            <p role="status" className="mb-3 text-sm font-medium">Your virtual try-on is ready.</p>
            <div className="overflow-hidden rounded-2xl bg-white/70">
              <Image src={result} alt={"Virtual try-on preview of " + product.name} width={1200} height={1200} unoptimized className="h-auto w-full" />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={result} download={"zoravelle-" + product.id + "-try-on.webp"} className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
                <Download className="h-4 w-4" /> Download result
              </a>
              <button type="button" onClick={() => { clearRequest(); setResult(""); setResultExpired(false); setError(""); removePhoto(); }} className="rounded-full border border-black/20 px-5 py-3 text-sm">Try another photo</button>
            </div>
            <p className="mt-3 text-xs text-black/55">Generated previews are available for download here for 24 hours.</p>
          </div>
        ) : resultExpired ? (
          <div className="mt-5 rounded-2xl bg-white/60 p-5 text-sm">
            <p>This generated preview has expired. Your try-on allowance remains attached to your account.</p>
            {!exhausted && (
              <button type="button" onClick={() => { clearRequest(); setResultExpired(false); setError(""); }} className="mt-4 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
                Use another try-on
              </button>
            )}
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              disabled={generating}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                choosePhoto(file);
              }}
              className="sr-only"
            />
            {preview ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#e9e4db]">
                  <Image src={preview} alt="Preview of your selected photo" fill unoptimized sizes="(min-width: 640px) 60vw, 100vw" className="object-contain" />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-sm font-medium">{photo?.name}</p>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={generating} className="mt-3 inline-flex items-center gap-2 text-sm underline underline-offset-4 disabled:opacity-50">
                    <Upload className="h-4 w-4" /> Replace photo
                  </button>
                  <button type="button" onClick={removePhoto} disabled={generating} className="mt-2 inline-flex items-center gap-2 text-sm underline underline-offset-4 disabled:opacity-50">
                    Remove photo
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={generating} className="mt-5 flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-black/25 bg-white/45 px-5 py-8 text-center transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50">
                <Upload className="h-6 w-6" />
                <span className="mt-3 font-medium">Upload or take a clear, front-facing photo to get started.</span>
                <span className="mt-1 text-xs text-black/55">JPG, PNG, or WebP, up to 5 MB</span>
              </button>
            )}

            <p className="mt-4 text-xs leading-relaxed text-black/55">
              Your photo is sent to Cloudflare Workers AI to create this preview. We do not save your face photo.
              The generated result is stored securely for up to 24 hours so an interrupted request can be recovered.
            </p>
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} className="mt-0.5 h-4 w-4 accent-black" />
              <span>I agree to send this photo to Cloudflare Workers AI for virtual try-on processing.</span>
            </label>

            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            {uncertain && requestId && (
              <button type="button" onClick={() => { setGenerating(true); setError(""); pollStatus(requestId, 8); }} className="mt-3 inline-flex items-center gap-2 text-sm underline underline-offset-4">
                <RefreshCw className="h-4 w-4" /> Check request status
              </button>
            )}

            {exhausted && <p className="mt-4 text-sm font-medium text-black/65">You have used both of your available try-ons.</p>}
            <button
              type="button"
              onClick={generate}
              disabled={generating || !photo || !consented || usageLoading || !usage || exhausted}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-4 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {generating ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Generating your virtual try-on...</> : "Generate Try-On"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}