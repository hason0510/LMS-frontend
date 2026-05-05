import React from "react";

export default function ResourceRenderer({ resource, className = "", compact = false }) {
  if (!resource) return null;

  const { fileUrl, embedUrl, hlsUrl, mimeType, type, title } = resource;
  const wrapperClass = className || "mt-2";
  const mediaUrl = hlsUrl || fileUrl || embedUrl;

  if ((type === "LINK" || resource.source === "EMBED") && embedUrl) {
    return (
      <div className={`${wrapperClass} overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900`}>
        <iframe
          src={embedUrl}
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
        className={`${wrapperClass} max-w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white object-contain`}
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
