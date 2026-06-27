import { sanitizeHtml } from "../../utils/sanitizeHtml";

// Renders user/teacher-authored HTML after sanitizing it through the shared
// allow-list. Use this anywhere instead of a raw dangerouslySetInnerHTML.
export default function SafeHtml({ html, className = "" }) {
  const clean = sanitizeHtml(html);

  if (!clean) {
    return null;
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
