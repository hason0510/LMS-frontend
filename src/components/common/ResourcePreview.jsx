import React from "react";

export default function ResourcePreview({ resource, className = "" }) {
  if (!resource) return null;

  const { fileUrl, embedUrl, mimeType, hlsUrl, type, title } = resource;
  const wrapperClass = className || "mt-2";

  if (type === "LINK" && embedUrl) {
    return (
      <div className={`${wrapperClass} overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700`}>
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
      <div className={wrapperClass}>
        <audio controls className="w-full rounded-lg" src={fileUrl}>
          <track kind="captions" />
        </audio>
      </div>
    );
  }

  if (mimeType?.startsWith("video/") || type === "VIDEO") {
    return (
      <div className={wrapperClass}>
        <video controls className="max-h-72 w-full rounded-lg" src={hlsUrl || fileUrl}>
          <track kind="captions" />
        </video>
      </div>
    );
  }

  if (mimeType?.startsWith("image/") || type === "IMAGE") {
    return (
      <img
        src={fileUrl}
        alt={title || ""}
        className={`${wrapperClass} max-w-full rounded-lg border border-gray-200 dark:border-gray-700`}
        style={{ maxHeight: 360 }}
      />
    );
  }

  if (!fileUrl) return null;

  return (
    <a href={fileUrl} target="_blank" rel="noreferrer" className={`${wrapperClass} block text-sm text-blue-600 underline`}>
      {title || fileUrl}
    </a>
  );
}
