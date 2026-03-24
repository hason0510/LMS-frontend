import React from 'react';
import { Modal } from 'antd';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function NotificationDetailModal({ open, notification, onClose }) {
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
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {notification.message}
            </p>
          </div>

          {notification.description && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Chi tiết
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {notification.description}
              </p>
            </div>
          )}

          {notification.actionUrl && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <a
                href={notification.actionUrl}
                className="inline-flex items-center justify-center w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                Xem chi tiết
              </a>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
