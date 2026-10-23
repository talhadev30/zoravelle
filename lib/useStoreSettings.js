"use client";
import { useEffect, useState } from "react";

const defaults = {
  storeName: "Zoravelle",
  announcement: "",
  contactEmail: "",
  phone: "",
  freeShippingThreshold: 150,
  shopMaxPrice: 200,
};

let cachedSettings = null;
let pendingSettings = null;
let updateListenerInstalled = false;
const subscribers = new Set();

function loadStoreSettings({ refresh = false } = {}) {
  if (refresh) {
    cachedSettings = null;
    pendingSettings = null;
  }

  if (cachedSettings) return Promise.resolve(cachedSettings);
  if (pendingSettings) return pendingSettings;

  const request = fetch("/api/settings", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Unable to load store settings");
      return response.json();
    })
    .then((value) => {
      const settings = { ...defaults, ...value };
      if (pendingSettings === request) {
        cachedSettings = settings;
        subscribers.forEach((subscriber) => subscriber(settings));
      }
      return settings;
    })
    .catch(() => cachedSettings || defaults)
    .finally(() => {
      if (pendingSettings === request) pendingSettings = null;
    });

  pendingSettings = request;
  return request;
}

function handleSettingsUpdated() {
  loadStoreSettings({ refresh: true });
}

export default function useStoreSettings() {
  const [settings, setSettings] = useState(() => cachedSettings || defaults);

  useEffect(() => {
    subscribers.add(setSettings);
    if (!updateListenerInstalled) {
      window.addEventListener("zv-settings-updated", handleSettingsUpdated);
      updateListenerInstalled = true;
    }

    loadStoreSettings();

    return () => {
      subscribers.delete(setSettings);
      if (subscribers.size === 0 && updateListenerInstalled) {
        window.removeEventListener("zv-settings-updated", handleSettingsUpdated);
        updateListenerInstalled = false;
      }
    };
  }, []);

  return settings;
}
