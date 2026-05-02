import React, { useMemo, useRef, useState } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router-dom";
import useRealtimeNotifications from "../../hooks/useRealtimeNotifications";
import NotificationToastStack from "./NotificationToastStack";

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const {
    notifications,
    unreadCount,
    loading,
    toasts,
    markAsRead,
    dismissToast,
  } = useRealtimeNotifications(true);

  React.useEffect(() => {
    const onClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const latest = useMemo(() => notifications.slice(0, 8), [notifications]);

  return (
    <>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <BellIcon className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Notifications
              </p>
              <span className="text-xs font-medium text-primary">
                Unread: {unreadCount}
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <p className="px-4 py-3 text-sm text-slate-500">Loading...</p>
              ) : latest.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">
                  No notifications
                </p>
              ) : (
                latest.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (!item.readStatus && !item.isRead) {
                        markAsRead(item.id);
                      }
                      if (item.actionUrl) {
                        setOpen(false);
                        navigate(item.actionUrl);
                      }
                    }}
                    className="w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                          {item.summary || item.description || item.message}
                        </p>
                        {item.classSectionTitle && (
                          <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
                            Lớp: {item.classSectionTitle}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatTimestamp(item.createdAt || item.time)}
                        </p>
                      </div>
                      {!item.readStatus && !item.isRead && (
                        <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-sky-500" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-slate-200 px-4 py-2 text-right dark:border-slate-700">
              <Link
                to="/notifications"
                className="text-xs font-semibold text-primary hover:text-primary/80"
              >
                View all
              </Link>
            </div>
          </div>
        )}
      </div>
      <NotificationToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
