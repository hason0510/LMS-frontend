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
