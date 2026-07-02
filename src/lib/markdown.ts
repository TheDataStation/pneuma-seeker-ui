// src/lib/markdown.ts
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({
  // Single newlines become <br> (GFM-style), matching the line-break-preserving
  // behavior chat messages had before markdown rendering was added.
  breaks: true,
  gfm: true,
});

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const ALLOWED_ATTR = ["href", "target", "rel", "class"];

// DOMPurify's default import needs a real global `window` to operate — it's
// a non-functional stub in Next.js's server render pass (Node, no DOM). Only
// wire it up in a browser-like environment (this also covers Jest's jsdom
// test environment, which does provide a usable `window`).
const isBrowser = typeof window !== "undefined";

if (isBrowser) {
  // Force external links to open safely in a new tab, and strip anything
  // else (onclick, style, etc.) DOMPurify's ALLOWED_ATTR list doesn't
  // already block. Only for anchors that still have an href after
  // sanitization — a dangerous href (javascript:, data:, etc.) gets
  // stripped by DOMPurify's own URI sanitizer before this hook runs, and
  // adding target/rel to what's left would dress up a dead, hrefless
  // anchor as if it were a normal, clickable link.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.hasAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders untrusted markdown (e.g. LLM output) to sanitized HTML safe for
 * dangerouslySetInnerHTML. Never call this on content the caller doesn't
 * want interpreted as markdown (e.g. raw user input).
 *
 * Server-side (no DOM to sanitize against), this falls back to escaped
 * plain text rather than risk emitting unsanitized HTML — the client
 * re-renders with fully sanitized markdown immediately on hydration, so
 * this is only ever a brief, safe placeholder.
 */
export function renderMarkdown(content: string): string {
  if (!isBrowser) return escapeHtml(content);
  const html = marked.parse(content, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
