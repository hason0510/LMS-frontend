import DOMPurify from "dompurify";

// Canonical allow-list for any user/teacher-authored HTML (react-quill output:
// lesson content, assignment description/instruction, submissions, feedback, quiz).
// Single source of truth so the policy can't drift between render sites.
//
// Goal: strip dangerous markup (script/iframe/object/form inputs, event handlers,
// javascript: URLs — all removed by DOMPurify defaults + FORBID_TAGS below) WITHOUT
// degrading legitimate formatting. The Quill editor stores text/cell colours and
// table borders as inline `style`, and the table module emits col/colgroup/contain
// elements; allowing those keeps authored content (colours, tables, alignment,
// math symbols, Vietnamese/Unicode text) rendering exactly as it was saved.
// Note: only the `style` *attribute* is allowed — the <style> *element* stays
// forbidden, and DOMPurify still scrubs dangerous CSS (expression/url(javascript:)).
export const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  ALLOWED_TAGS: [
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "col",
    "colgroup",
    "contain",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
  ],
  ALLOWED_ATTR: [
    "alt",
    "bgcolor",
    "border",
    "cellpadding",
    "cellspacing",
    "class",
    "colspan",
    "height",
    "href",
    "rel",
    "rowspan",
    "src",
    "style",
    "target",
    "title",
    "width",
  ],
  // Keep data-* attributes: the table module marks full-width tables with
  // `data-full` (CSS `.ql-table[data-full]{width:100%}`); stripping it would
  // shrink tables. data-* attributes are inert (no script capability).
  ALLOW_DATA_ATTR: true,
  FORBID_TAGS: ["form", "iframe", "input", "object", "script", "style", "textarea"],
};

export const sanitizeHtml = (html = "") => DOMPurify.sanitize(html ?? "", SANITIZE_CONFIG);

// Escape plain text that gets interpolated into a developer-built HTML string
// (e.g. cloze previews), so the inserted value can't break out into markup.
export const escapeHtml = (value = "") =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
