"use client";

import useStoreSettings from "@/lib/useStoreSettings";

export default function AnnouncementBar() {
  const settings = useStoreSettings();
  const message =
    typeof settings.announcement === "string"
      ? settings.announcement.trim()
      : "";

  return (
    <div
      aria-hidden={!message}
      className={
        message
          ? "flex h-8 w-full items-center justify-center overflow-hidden bg-black px-3 text-center font-space text-[11px] text-white/80 sm:text-xs"
          : "h-8 w-full"
      }
    >
      {message ? (
        <span className="block max-w-full truncate" title={message}>
          {message}
        </span>
      ) : null}
    </div>
  );
}
