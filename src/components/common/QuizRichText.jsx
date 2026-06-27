import { sanitizeHtml } from "../../utils/sanitizeHtml";

const BASE_CLASS =
  "max-w-none text-inherit [&_.ql-align-center]:text-center [&_.ql-align-right]:text-right [&_.ql-align-justify]:text-justify [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-3 [&_h3]:mt-2 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mb-2 [&_h4]:mt-2 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-3 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-slate-100 [&_code]:break-words [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-slate-300 [&_td]:px-3 [&_td]:py-2 dark:[&_blockquote]:border-slate-700 dark:[&_th]:border-slate-700 dark:[&_th]:bg-slate-800 dark:[&_td]:border-slate-700";

export default function QuizRichText({ html, className = "" }) {
  const safeHtml = sanitizeHtml(html);

  if (!safeHtml) {
    return null;
  }

  return (
    <div
      className={className ? `${BASE_CLASS} ${className}` : BASE_CLASS}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
