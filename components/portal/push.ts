"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Phone / desktop alerts (Web Push). Registers the service worker once, and — only when the person
 * taps "Turn on alerts" — asks the browser for permission and saves the subscription.
 * On iPhone this works once the client space is added to the Home Screen (iOS 16.4+).
 */
function keyToBytes(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function usePush(endpoint: string, featureOn: boolean) {
  const [supported, setSupported] = useState(false);
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [key, setKey] = useState("");

  useEffect(() => {
    if (!featureOn || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    setSupported(true);
    let cancelled = false;
    void (async () => {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => null);
      const response = await fetch("/api/push-key", { cache: "no-store" }).catch(() => null);
      const data = response?.ok ? ((await response.json()) as { key: string }) : { key: "" };
      if (cancelled || !registration || !data.key) return;
      setKey(data.key);
      setAvailable(true);
      const existing = await registration.pushManager.getSubscription();
      if (existing && Notification.permission === "granted") {
        setEnabled(true);
        // Keep the server's copy fresh (e.g. after the person signed in on a shared device).
        void fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: existing.toJSON() }) });
      }
    })();
    return () => { cancelled = true; };
  }, [endpoint, featureOn]);

  const enable = useCallback(async () => {
    if (!key) return false;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = (await registration.pushManager.getSubscription()) || (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) }));
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: subscription.toJSON() }) });
    setEnabled(response.ok);
    return response.ok;
  }, [endpoint, key]);

  const disable = useCallback(async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch(endpoint, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
      await subscription.unsubscribe();
    }
    setEnabled(false);
  }, [endpoint]);

  return { supported, available, enabled, enable, disable };
}
