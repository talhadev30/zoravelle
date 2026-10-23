"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function ProductTryOnImageUpload({ tryOnImage, onUploaded, onUploadingChange }) {
  const [preview, setPreview] = useState(tryOnImage || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const localPreviewRef = useRef("");

  useEffect(() => () => {
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
  }, []);

  async function uploadFile(file) {
    if (!file) return;
    setError("");
    if (!allowedTypes.has(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Image must be 10 MB or smaller.");
      return;
    }

    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = URL.createObjectURL(file);
    setPreview(localPreviewRef.current);
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/admin/products/upload-try-on-image", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not upload the try-on image.");
      setPreview(result.url);
      onUploaded?.({ tryOnImage: result.url });
    } catch (uploadError) {
      setError(uploadError.message || "Could not upload the try-on image.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  function clearImage() {
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = "";
    setPreview("");
    onUploaded?.({ tryOnImage: "" });
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-black/10 bg-white/60 p-4 sm:col-span-2">
      <div>
        <label className="text-sm font-medium">
          Virtual try-on frame image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              uploadFile(file);
            }}
            disabled={uploading}
            className="mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-xs file:font-medium file:text-white"
          />
        </label>
        <p className="mt-2 text-xs text-black/55">
          Upload a clear, straight-on front view of the frame. A transparent PNG or WebP is best.
          This asset is stored on ImageKit without AI enhancement.
        </p>
      </div>

      {preview && (
        <div className="grid gap-3 rounded-xl border border-black/10 p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-[#f1ece4]">
            <Image src={preview} alt="Virtual try-on frame preview" fill unoptimized sizes="112px" className="object-contain p-2" />
          </div>
          <div className="min-w-0">
            {uploading ? <p role="status" className="text-sm">Uploading try-on image...</p> : <p className="text-sm text-emerald-800">Try-on image ready</p>}
            <button type="button" onClick={clearImage} disabled={uploading} className="mt-2 text-xs underline underline-offset-4 disabled:opacity-50">
              Remove try-on image
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </section>
  );
}