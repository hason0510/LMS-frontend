/**
 * Detect resource type từ file
 * @param {File} file - File object
 * @returns {string} Resource type: VIDEO, SLIDE, DOCX, IMAGE, etc.
 */
export function getResourceTypeFromFile(file) {
  if (!file) return "SLIDE";

  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();

  // Video types
  if (
    mimeType.startsWith("video/") ||
    fileName.endsWith(".mp4") ||
    fileName.endsWith(".avi") ||
    fileName.endsWith(".mov") ||
    fileName.endsWith(".mkv") ||
    fileName.endsWith(".webm")
  ) {
    return "VIDEO";
  }

  // PDF
  if (
    mimeType === "application/pdf" ||
    fileName.endsWith(".pdf")
  ) {
    return "PDF";
  }

  // Word documents
  if (
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  ) {
    return "DOCX";
  }

  // PowerPoint
  if (
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    fileName.endsWith(".ppt") ||
    fileName.endsWith(".pptx")
  ) {
    return "SLIDE";
  }

  // Excel
  if (
    mimeType === "application/vnd.ms-excel" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx")
  ) {
    return "SLIDE"; // Or could be SPREADSHEET if that type exists
  }

  // Images
  if (
    mimeType.startsWith("image/") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".png") ||
    fileName.endsWith(".gif") ||
    fileName.endsWith(".webp")
  ) {
    return "IMAGE";
  }

  // Text files
  if (
    mimeType === "text/plain" ||
    fileName.endsWith(".txt")
  ) {
    return "SLIDE";
  }

  // Default to SLIDE for unknown types
  return "SLIDE";
}

/**
 * Check if a file is a video
 * @param {File} file - File object
 * @returns {boolean}
 */
export function isVideoFile(file) {
  return getResourceTypeFromFile(file) === "VIDEO";
}

/**
 * Check if a file is a document (SLIDE, DOCX, etc)
 * @param {File} file - File object
 * @returns {boolean}
 */
export function isDocumentFile(file) {
  const type = getResourceTypeFromFile(file);
  return type !== "VIDEO" && type !== "IMAGE";
}

/**
 * Format file size to human readable string
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size like "1.5 MB"
 */
export function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get file extension from URL or filename
 * @param {string} filename - Filename or URL
 * @returns {string} Extension without dot (e.g., "pdf", "docx")
 */
export function getFileExtension(filename) {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

/**
 * Get file type category for handling
 * @param {string} mimeType - MIME type
 * @param {string} filename - Filename
 * @returns {string} Type: 'pdf', 'image', 'video', 'audio', 'document', 'archive', 'other'
 */
export function getFileTypeCategory(mimeType, filename) {
  const ext = getFileExtension(filename);
  const mime = (mimeType || "").toLowerCase();
  
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  if (["doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "rtf"].includes(ext)) return "document";
  
  return "other";
}

/**
 * Determine if file should open in new tab vs force download
 * @param {string} fileUrl - File URL
 * @param {string} mimeType - MIME type
 * @param {string} filename - Filename
 * @returns {boolean} true = open in tab, false = force download
 */
export function shouldOpenInNewTab(fileUrl, mimeType, filename) {
  const category = getFileTypeCategory(mimeType, filename);
  
  // These types can be previewed in browser
  const viewableTypes = ["pdf", "image", "video", "audio"];
  
  return viewableTypes.includes(category);
}

/**
 * Generate download URL with force download flag
 * @param {string} fileUrl - File URL
 * @param {string} filename - Filename for download
 * @returns {string} URL with download parameter
 */
export function getDownloadUrl(fileUrl, filename) {
  if (!fileUrl) return "#";
  
  // For Cloudinary URLs, add fl_attachment for force download
  if (fileUrl.includes("cloudinary.com")) {
    const encodedName = encodeURIComponent(filename || "download");
    return `${fileUrl}?fl_attachment=${encodedName}`;
  }
  
  // For other URLs, just return as is (browser will handle)
  return fileUrl;
}

/**
 * Open file in new tab
 * @param {string} fileUrl - File URL to open
 */
export function openFileInNewTab(fileUrl) {
  if (!fileUrl) return;
  window.open(fileUrl, "_blank", "noopener,noreferrer");
}

/**
 * Download file (force download)
 * @param {string} fileUrl - File URL
 * @param {string} filename - Filename for download
 */
export function downloadFile(fileUrl, filename) {
  const url = getDownloadUrl(fileUrl, filename);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "";
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get icon name based on file type
 * @param {string} mimeType - MIME type
 * @param {string} filename - Filename
 * @returns {string} Icon component name for UI library
 */
export function getFileIconType(mimeType, filename) {
  const category = getFileTypeCategory(mimeType, filename);
  
  switch (category) {
    case "pdf":
      return "file-pdf";
    case "image":
      return "photo";
    case "video":
      return "video-camera";
    case "audio":
      return "music";
    case "archive":
      return "folder-zip";
    case "document":
      return "document";
    default:
      return "file";
  }
}
