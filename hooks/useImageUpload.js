"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function useImageUpload({
  initialImage = "",
  initialFileId = "",
  initialEnhanced = false,
  onUploaded,
  onUploadingChange,
}) {
  const [state, setState] = useState(() => ({
    preview: initialImage,
    url: initialImage,
    fileId: initialFileId,
    enhanced: Boolean(initialEnhanced),
    status: initialImage ? "success" : "idle",
    error: "",
    originalName: "",
  }));
  const previewUrlRef = useRef(null);
  const controllerRef = useRef(null);
  const requestIdRef = useRef(0);

  const uploadFile = useCallback(async (file) => {
    if (!file) return;

    controllerRef.current?.abort();
    const requestId = ++requestIdRef.current;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const localPreview = URL.createObjectURL(file);
    previewUrlRef.current = localPreview;

    setState({
      preview: localPreview,
      url: "",
      fileId: "",
      enhanced: false,
      status: "uploading",
      error: "",
      originalName: file.name,
    });
    onUploadingChange?.(true);

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setState((current) => ({ ...current, status: "error", error: "Choose a JPG, PNG, or WebP image." }));
      onUploadingChange?.(false);
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setState((current) => ({ ...current, status: "error", error: "Image must be 10 MB or smaller." }));
      onUploadingChange?.(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/admin/products/upload-image", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not upload this image.");
      if (requestId !== requestIdRef.current) return;

      setState({
        preview: result.url,
        url: result.url,
        fileId: result.fileId,
        enhanced: Boolean(result.enhanced),
        status: "success",
        error: "",
        originalName: result.originalName || file.name,
      });
      onUploaded?.({
        image: result.url,
        imageFileId: result.fileId,
        imageEnhanced: Boolean(result.enhanced),
      });
    } catch (error) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      setState((current) => ({
        ...current,
        status: "error",
        error: error.message || "Could not upload this image. Please try again.",
      }));
    } finally {
      if (requestId === requestIdRef.current) {
        controllerRef.current = null;
        onUploadingChange?.(false);
      }
    }
  }, [onUploaded, onUploadingChange]);

  useEffect(() => () => {
    requestIdRef.current += 1;
    controllerRef.current?.abort();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  return { ...state, uploadFile };
}