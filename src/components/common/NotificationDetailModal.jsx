import React from 'react';
import { Modal } from 'antd';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function NotificationDetailModal({ open, notification, onClose }) {
  const navigate = useNavigate();
  const primaryText = notification?.summary || notification?.message || notification?.description || "";
  const detailText = notification?.description || "";
  const showDetail = detailText && detailText.trim() && detailText.trim() !== primaryText.trim();

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      closeIcon={<XMarkIcon className="h-5 w-5" />}
      width={500}
    >
      {notification && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {notification.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Thời gian gửi: {notification.time}
            </p>
            {notification.classSectionTitle && (
              <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                Lớp: {notification.classSectionTitle}
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {primaryText}
            </p>
          </div>

          {showDetail && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Chi tiết
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {detailText}
              </p>
            </div>
          )}

          {notification.actionUrl && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  navigate(notification.actionUrl);
                }}
                className="inline-flex items-center justify-center w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                Xem chi tiết
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
