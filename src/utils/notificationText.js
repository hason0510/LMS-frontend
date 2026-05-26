export function stripNotificationHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, " ")
    .replace(/<li\b[^>]*>/gi, " - ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeNotificationItem(notification) {
  if (!notification) {
    return notification;
  }

  return {
    ...notification,
    title: stripNotificationHtml(notification.title),
    message: stripNotificationHtml(notification.message),
    description: stripNotificationHtml(notification.description),
    summary: stripNotificationHtml(notification.summary),
    readStatus: Boolean(notification.readStatus || notification.isRead),
  };
}

export function getNotificationPreview(notification) {
  return stripNotificationHtml(
    notification?.summary || notification?.description || notification?.message
  );
}
