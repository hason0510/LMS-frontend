import React from "react";
import { looksLikeImageUrl } from "../../utils/fileUtils";

export default function ResourceRenderer({ resource, className = "", compact = false, thumbnail = false }) {
  if (!resource) return null;

  const { fileUrl, embedUrl, mimeType, type, title } = resource;
  const wrapperClass = className || "mt-2";
  const mediaUrl = fileUrl || embedUrl;
  const iframeSrc = normalizeEmbedUrl(embedUrl);

  if (resource.source === "EMBED" && iframeSrc) {
    return (
      <div className={`${wrapperClass} overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900`}>
        <iframe
          src={iframeSrc}
          className={`${compact ? "h-full min-h-[190px]" : "aspect-video"} w-full`}
          allowFullScreen
          title={title || "embed"}
        />
      </div>
    );
  }

  if (mimeType?.startsWith("audio/") || type === "AUDIO") {
    return (
      <div className={`${wrapperClass} rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 p-2`}>
        <audio controls className="w-full" src={mediaUrl}>
          <track kind="captions" />
        </audio>
      </div>
    );
  }

  if (mimeType?.startsWith("video/") || type === "VIDEO") {
    // Chế độ thumbnail: chỉ hiện 1 khung hình tĩnh + nút play, KHÔNG controls.
    // Tránh nhồi mini-player có thanh điều khiển bị cắt vào ô lưới.
    // Phát đầy đủ diễn ra khi mở MediaDetailModal (ResourceRenderer không compact).
    if (thumbnail) {
      const rawPoster = fileUrl || mediaUrl;
      const posterSrc = rawPoster && !rawPoster.includes("#") ? `${rawPoster}#t=0.1` : rawPoster;
      return (
        <div className={`${wrapperClass} relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-black`}>
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={posterSrc}
            preload="metadata"
            muted
            playsInline
            tabIndex={-1}
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-1 ring-white/30">
              <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-5 w-5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </div>
      );
    }
    return (
      <div className={`${wrapperClass} overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-black`}>
        <video controls className={`${compact ? "h-full min-h-[190px] max-h-[240px] object-contain" : "max-h-80"} w-full`} src={mediaUrl}>
          <track kind="captions" />
        </video>
      </div>
    );
  }

  if (mimeType?.startsWith("image/") || type === "IMAGE") {
    return (
      <img
        src={fileUrl || mediaUrl}
        alt={title || ""}
        className={`${wrapperClass} max-w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 object-contain`}
        style={{ maxHeight: compact ? 220 : 360 }}
      />
    );
  }

  if (!mediaUrl) return null;

  // Media kiểu LINK có thể trỏ tới một ảnh. Thử render thành ảnh (kể cả ở lưới
  // thumbnail); nếu URL không phải ảnh hợp lệ (tải lỗi) thì LinkImage tự fallback
  // về liên kết text. compact/maxHeight + object-contain giữ ảnh vừa trong ô lưới
  // nên không phá layout.
  const isLinkType = type === "LINK" || resource.source === "LINK";
  if (isLinkType || looksLikeImageUrl(mediaUrl)) {
    return <LinkImage src={mediaUrl} title={title} wrapperClass={wrapperClass} compact={compact} />;
  }

  return (
    <a href={mediaUrl} target="_blank" rel="noreferrer" className={`${wrapperClass} block text-sm text-blue-600 underline`}>
      {title || mediaUrl}
    </a>
  );
}

// Render ảnh từ URL (vd media kiểu LINK trỏ tới ảnh). Nếu ảnh tải lỗi -> coi như
// "không có ảnh hợp lệ" -> hiển thị về liên kết text như cũ.
function LinkImage({ src, title, wrapperClass, compact }) {
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <a href={src} target="_blank" rel="noreferrer" className={`${wrapperClass} block text-sm text-blue-600 underline`}>
        {title || src}
      </a>
    );
  }

  return (
    <img
      src={src}
      alt={title || ""}
      onError={() => setFailed(true)}
      className={`${wrapperClass} max-w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 object-contain`}
      style={{ maxHeight: compact ? 220 : 360 }}
    />
  );
}

function normalizeEmbedUrl(url) {
  if (!url) return null;

  const trimmed = String(url).trim();
  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return trimmed;
}
