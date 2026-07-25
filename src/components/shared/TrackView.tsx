"use client";

import { useEffect, useRef } from "react";

interface TrackViewProps {
  profileId: string;
}

export default function TrackView({ profileId }: TrackViewProps): null {
  const fired = useRef(false);

  useEffect(() => {
    // Guard: StrictMode double-mount + dedup per session
    if (fired.current) return;
    const key = `mu:viewed:${profileId}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;

    fired.current = true;
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(key, "1");

    // Fire-and-forget POST
    const body = JSON.stringify({ profileId, event: "view" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/v1/public/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/v1/public/track", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  }, [profileId]);

  return null;
}
