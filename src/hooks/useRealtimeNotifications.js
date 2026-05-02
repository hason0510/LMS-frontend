import { useEffect, useRef, useState } from "react";
import {
  countUnreadNotifications,
  getMyNotifications,
  markNotificationAsRead,
} from "../api/notification";

const POLLING_INTERVAL_MS = 15000;

function normalizeNotification(item) {
  return {
    ...item,
    readStatus: Boolean(item.readStatus || item.isRead),
  };
}

export default function useRealtimeNotifications(enabled = true) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const initializedRef = useRef(false);
  const knownIdsRef = useRef(new Set());

  const fetchNotifications = async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const [list, unread] = await Promise.all([
        getMyNotifications(),
        countUnreadNotifications(),
      ]);

      const listData = Array.isArray(list) ? list : list?.data || [];
      const unreadData = typeof unread === "number" ? unread : unread?.data;
      const normalized = (listData || []).map(normalizeNotification);
      setNotifications(normalized);
      setUnreadCount(Number(unreadData || 0));

      const incomingIds = new Set(normalized.map((item) => item.id));
      if (initializedRef.current) {
        const newItems = normalized.filter(
          (item) => !knownIdsRef.current.has(item.id)
        );
        if (newItems.length > 0) {
          setToasts((prev) => [
            ...newItems
              .slice(0, 3)
              .map((item) => ({
                id: `toast-${item.id}-${Date.now()}`,
                title: item.title,
                message: item.summary || item.description || item.message,
              })),
            ...prev,
          ]);
        }
      }

      knownIdsRef.current = incomingIds;
      initializedRef.current = true;
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return undefined;
    fetchNotifications();
    const timer = window.setInterval(fetchNotifications, POLLING_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [enabled]);

  const markAsRead = async (notificationId) => {
    await markNotificationAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, readStatus: true } : item
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const dismissToast = (toastId) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  };

  return {
    notifications,
    unreadCount,
    loading,
    toasts,
    fetchNotifications,
    markAsRead,
    dismissToast,
  };
}
