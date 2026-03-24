import React from 'react';
import { useTranslation } from 'react-i18next';

export default function ConfirmModal({
  open = false,
  title = 'Xác nhận hành động',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này không?',
  actionName = 'Xác nhận',
  color = 'primary',
  onConfirm = () => {},
  onCancel = () => {},
  isLoading = false,
}) {
  const { t } = useTranslation();
  
  if (!open) return null;

  // Map color để tạo class name động
  const getActionButtonClass = (color) => {
    const baseClass = 'flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 text-sm font-bold leading-normal tracking-[0.015em] focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

    const colorClasses = {
      primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary',
      red: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      green: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
      orange: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
    };

    return `${baseClass} ${colorClasses[color] || colorClasses.primary}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Modal */}
      <div className="layout-container flex w-full max-w-md flex-col rounded-xl bg-white shadow-2xl dark:bg-background-dark dark:border dark:border-white/10 relative z-10">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark"
            disabled={isLoading}
          >
            <span className="material-symbols-outlined !text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 text-base font-normal leading-relaxed text-left">
            {message}
          </p>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 dark:bg-background-dark/50 rounded-b-xl border-t border-gray-200 dark:border-white/10">
          <button
            onClick={onCancel}
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-bold leading-normal tracking-[0.015em] border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={isLoading}
          >
            <span className="truncate">{t('common.huyBo')}</span>
          </button>
          <button
            onClick={onConfirm}
            className={getActionButtonClass(color)}
            disabled={isLoading}
          >
            <span className="truncate">
              {isLoading ? t('common.dangXuLy') : actionName}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
