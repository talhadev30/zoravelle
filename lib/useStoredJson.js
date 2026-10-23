"use client";
import { useMemo, useSyncExternalStore } from "react";

export function useStoredJson(key, fallback, eventName) {
  const serialized = useSyncExternalStore(
    (callback) => {
      const onStorage = (event) => { if (!event.key || event.key === key) callback(); };
      window.addEventListener("storage", onStorage);
      if (eventName) window.addEventListener(eventName, callback);
      return () => { window.removeEventListener("storage", onStorage); if (eventName) window.removeEventListener(eventName, callback); };
    },
    () => window.localStorage.getItem(key),
    () => null,
  );
  const value = useMemo(() => {
    if (serialized === null) return fallback;
    try { return JSON.parse(serialized); } catch { return fallback; }
  }, [serialized, fallback]);
  return value;
}

export function useHasHydrated() {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

export function writeStoredJson(key, value, eventName) {
  window.localStorage.setItem(key, JSON.stringify(value));
  if (eventName) window.dispatchEvent(new Event(eventName));
}
