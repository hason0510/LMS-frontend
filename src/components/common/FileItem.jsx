import React from "react";
import {
  DocumentTextIcon,
  FilmIcon,
  PhotoIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  TrashIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import { formatFileSize, getFileTypeCategory, openFileInNewTab } from "../../utils/fileUtils";

/**
 * Shared FileItem component for displaying files with clickable actions
 * @param {Object} props
 * @param {string} props.fileUrl - URL of the file
 * @param {string} props.fileName - Display name of the file
 * @param {number} props.fileSize - Size in bytes
 * @param {string} props.mimeType - MIME type
 * @param {string} props.type - Resource type (VIDEO, PDF, IMAGE, etc.)
 * @param {string} props.source - Source: UPLOAD, EMBED, LINK
 * @param {string} props.embedUrl - For link sources
 * @param {Function} props.onDelete - Callback when delete is clicked
 * @param {boolean} props.showDelete - Show delete button (default: true for teachers)
 * @param {boolean} props.compact - Compact mode (smaller padding)
 */
export default function FileItem({
  fileUrl,
  fileName,
  fileSize,
  mimeType,
  type,
  source,
  embedUrl,
  onDelete,
  showDelete = true,
  compact = false,
}) {
  // Determine the effective URL
  const effectiveUrl = embedUrl || fileUrl;

  // Get file type category
  const fileCategory = getFileTypeCategory(mimeType, fileName);

  // Handle file click - opens in new tab
  const handleOpen = (e) => {
    e?.stopPropagation();
    if (effectiveUrl) {
      openFileInNewTab(effectiveUrl);
    }
  };

  // Handle delete
  const handleDelete = (e) => {
    e?.stopPropagation();
    onDelete?.();
  };
  
  // Get icon based on file type
  const getIcon = () => {
    const iconClass = "h-5 w-5";
    
    // Check source first for links
    if (source === "EMBED" || source === "LINK" || embedUrl) {
      return <LinkIcon className={`${iconClass} text-blue-500`} />;
    }
    
    switch (fileCategory) {
      case "pdf":
        return <DocumentTextIcon className={`${iconClass} text-red-500`} />;
      case "image":
        return <PhotoIcon className={`${iconClass} text-green-500`} />;
      case "video":
        return <FilmIcon className={`${iconClass} text-purple-500`} />;
      case "audio":
        return <MusicalNoteIcon className={`${iconClass} text-yellow-500`} />;
      case "archive":
        return <ArchiveBoxIcon className={`${iconClass} text-orange-500`} />;
      default:
        return <DocumentTextIcon className={`${iconClass} text-gray-500`} />;
    }
  };
  
  // Get file type label
  const getTypeLabel = () => {
    if (source === "EMBED" || source === "LINK" || embedUrl) {
      return "Link";
    }
    if (type) return type;
    return fileCategory.toUpperCase();
  };
  
  // Determine the clickable element
  const isLink = source === "EMBED" || source === "LINK" || embedUrl;
  
  return (
    <div
      className={`flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors group ${
        !isLink && effectiveUrl ? "cursor-pointer" : ""
      } ${compact ? "p-2" : ""}`}
      onClick={!isLink && effectiveUrl ? handleOpen : undefined}
    >
      {/* Left side - Icon and file info */}
      <div className="flex items-center gap-3 overflow-hidden min-w-0">
        <div className={`p-2 rounded-lg bg-slate-100 dark:bg-gray-700 shrink-0`}>
          {getIcon()}
        </div>
        <div className="flex flex-col min-w-0">
          <p 
            className={`font-medium truncate text-slate-900 dark:text-slate-100 ${!isLink && effectiveUrl ? "group-hover:text-primary cursor-pointer" : ""}`}
            onClick={isLink ? handleOpen : undefined}
            title={fileName}
          >
            {fileName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {getTypeLabel()}
            {fileSize ? ` • ${formatFileSize(fileSize)}` : ""}
          </p>
        </div>
      </div>
      
      {/* Right side - Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Delete button */}
        {showDelete && onDelete && (
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Xóa"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Simple file item for display only (no actions)
 */
export function FileItemSimple({
  fileUrl,
  fileName,
  fileSize,
  mimeType,
  type,
  source,
  embedUrl,
}) {
  return (
    <FileItem
      fileUrl={fileUrl}
      fileName={fileName}
      fileSize={fileSize}
      mimeType={mimeType}
      type={type}
      source={source}
      embedUrl={embedUrl}
      showDelete={false}
    />
  );
}

/**
 * File item for uploads pending (no URL yet)
 */
export function FileItemPending({
  fileName,
  fileSize,
  onDelete,
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-3 overflow-hidden min-w-0">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-gray-700 shrink-0">
          <DocumentTextIcon className="h-5 w-5 text-gray-400" />
        </div>
        <div className="flex flex-col min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-slate-100" title={fileName}>
            {fileName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chưa tải lên • {formatFileSize(fileSize)}
          </p>
        </div>
      </div>
      
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Xóa"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
