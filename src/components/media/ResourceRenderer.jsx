import React from "react";

export default function ResourceRenderer({ resource, className = "", compact = false }) {
  if (!resource) return null;

  const { fileUrl, embedUrl, hlsUrl, mimeType, type, title } = resource;
  const wrapperClass = className || "mt-2";
  const mediaUrl = hlsUrl || fileUrl || embedUrl;
  const iframeSrc = normalizeEmbedUrl(embedUrl);

  if (resource.source === "EMBED" && iframeSrc) {
    return (
      <div className={`${wrapperClass} overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900`}>
        <iframe
          src={iframeSrc}
          className="aspect-video w-full"
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
    return (
      <div className={`${wrapperClass} overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-black`}>
        <video controls className={`${compact ? "max-h-44" : "max-h-80"} w-full`} src={mediaUrl}>
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
        style={{ maxHeight: compact ? 160 : 360 }}
      />
    );
  }

  if (!mediaUrl) return null;

  return (
    <a href={mediaUrl} target="_blank" rel="noreferrer" className={`${wrapperClass} block text-sm text-blue-600 underline`}>
      {title || mediaUrl}
    </a>
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
