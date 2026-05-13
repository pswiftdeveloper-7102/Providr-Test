"use client";

import { useEffect } from "react";

// Registers the service worker on first mount. Kept as a tiny client
// component mounted from the root layout so it runs everywhere without
// adding to the bundle weight of individual pages.
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("Service worker failed to register", err));
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}