// src/lib/useClickOutside.ts
import { useEffect, useRef } from "react";

/**
 * Calls `onOutsideClick` when a mousedown occurs outside `ref`'s element.
 *
 * `onOutsideClick` is read via a ref internally, so callers can pass an
 * inline arrow function without it re-subscribing the listener on every
 * render (only `ref` identity or `enabled` toggling re-attaches it).
 */
export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onOutsideClick: () => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(onOutsideClick);

  // Keep the ref in sync after every commit, not during render (writing to
  // a ref during render is unsafe/disallowed by React's rules-of-hooks).
  useEffect(() => {
    callbackRef.current = onOutsideClick;
  });

  useEffect(() => {
    if (!enabled) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callbackRef.current();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, enabled]);
}
