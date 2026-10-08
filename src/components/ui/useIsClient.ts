"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

function subscribeMedia(query: string) {
  return (callback: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
  };
}

const mediaSubscribers = new Map<string, (callback: () => void) => () => void>();

export function useMediaQuery(query: string, serverValue = false): boolean {
  let subscribe = mediaSubscribers.get(query);
  if (!subscribe) {
    subscribe = subscribeMedia(query);
    mediaSubscribers.set(query, subscribe);
  }
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}

export const MOBILE_QUERY = "(max-width: 767px)";
