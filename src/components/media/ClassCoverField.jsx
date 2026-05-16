import React from "react";
import { PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";
import MediaAttachButton from "./MediaAttachButton";

const toPreviewResource = (imageUrl) => {
  if (!imageUrl) return null;
  return {
    type: "IMAGE",
    fileUrl: imageUrl,
    title: "Class cover",
  };
};

const toImageUrl = (resource) => {
  if (!resource) return null;
  return resource.fileUrl || resource.embedUrl || resource.hlsUrl || null;
};

export default function ClassCoverField({
  imageUrl,
  onChange,
  title = "Ảnh lớp học",
  description = "Chọn ảnh từ kho media, dán link ảnh, hoặc tải ảnh mới lên.",
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
        <div className="aspect-[16/7] w-full">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-900">
              <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                <PhotoIcon className="h-10 w-10" />
                <span className="text-xs font-medium">Chưa có ảnh lớp học</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MediaAttachButton
          resource={toPreviewResource(imageUrl)}
          allowedTypes={["IMAGE"]}
          label={imageUrl ? "Đổi ảnh" : "Chọn ảnh"}
          onChange={(mediaPatch) => onChange?.(toImageUrl(mediaPatch?.resource))}
        />
        {imageUrl ? (
          <button
            type="button"
            onClick={() => onChange?.(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-slate-600 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <TrashIcon className="h-4 w-4" />
            Xóa ảnh
          </button>
        ) : null}
      </div>
    </div>
  );
}
