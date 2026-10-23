"use client";
import Image from "next/image";
import useImageUpload from "@/hooks/useImageUpload";

export default function ProductImageUpload({
  image,
  imageFileId,
  imageEnhanced,
  onUploaded,
  onUploadingChange,
}) {
  const upload = useImageUpload({
    initialImage: image,
    initialFileId: imageFileId,
    initialEnhanced: imageEnhanced,
    onUploaded,
    onUploadingChange,
  });

  function handleFileChange(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) upload.uploadFile(file);
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-black/10 bg-white/60 p-4 sm:col-span-2">
      <div>
        <label className="text-sm font-medium">
          Product image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-xs file:font-medium file:text-white"
          />
        </label>
        <p className="mt-2 text-xs text-black/55">JPG, PNG, or WebP. Maximum size 10 MB.</p>
      </div>

      {upload.preview && (
        <div className="grid gap-3 rounded-xl border border-black/10 p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-[#f1ece4]">
            <Image src={upload.preview} alt="Product image preview" fill unoptimized sizes="112px" className="object-contain p-2" />
          </div>
          <div className="min-w-0">
            {upload.status === "uploading" && <p role="status" className="text-sm font-medium">Enhancing and uploading image...</p>}
            {upload.status === "success" && (
              <>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${upload.enhanced ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                  {upload.enhanced ? "Enhanced by AI" : "Original used"}
                </span>
                {upload.url && <a href={upload.url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-black/60 underline" title={upload.url}>{upload.url}</a>}
              </>
            )}
            {upload.status === "idle" && <p className="text-sm text-black/55">Current product image</p>}
            {upload.status === "error" && <p role="alert" className="text-sm text-red-700">{upload.error}</p>}
          </div>
        </div>
      )}
      {!upload.preview && upload.status === "error" && <p role="alert" className="text-sm text-red-700">{upload.error}</p>}
    </section>
  );
}