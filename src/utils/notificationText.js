import i18n from "../i18n/config";

const ADAPTIVE_MESSAGE_KEYS = {
  ASSIGNMENT_ADAPTIVE_COHORT: "notifications.adaptive.cohort",
  ASSIGNMENT_ADAPTIVE_PERSONAL: "notifications.adaptive.personal",
  ASSIGNMENT_ADAPTIVE_PERSONAL_GENTLE: "notifications.adaptive.personalGentle",
};

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

  const title = stripNotificationHtml(notification.title);
  const adaptiveKey = ADAPTIVE_MESSAGE_KEYS[notification.type];
  const localized = adaptiveKey ? i18n.t(adaptiveKey, { title }) : null;

  return {
    ...notification,
    title,
    message: localized ?? stripNotificationHtml(notification.message),
    description: localized ?? stripNotificationHtml(notification.description),
    summary: localized ?? stripNotificationHtml(notification.summary),
    readStatus: Boolean(notification.readStatus || notification.isRead),
  };
}

export function getNotificationPreview(notification) {
  return stripNotificationHtml(
    notification?.summary || notification?.description || notification?.message
  );
}
