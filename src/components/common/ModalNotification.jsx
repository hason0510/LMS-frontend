import React from 'react';

export default function ModalNotification({ open, title, message, onClose, onRetry }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-background-dark rounded-xl shadow-2xl">
        <div className="flex items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
            <span className="material-symbols-outlined text-red-600 dark:text-red-300">error</span>
          </div>
          <div className="ml-4 text-left">
            <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white" id="modal-title">{title || 'Đăng nhập thất bại'}</h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">{message || 'Vui lòng kiểm tra lại thông tin email và mật khẩu của bạn.'}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          {onRetry && (
            <button
              className="inline-flex w-full justify-center rounded-lg border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-background-dark sm:ml-3 sm:w-auto sm:text-sm"
              type="button"
              onClick={onRetry}
            >
              Thử lại
            </button>
          )}
          <button
            className="mt-3 inline-flex w-full justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark sm:mt-0 sm:w-auto sm:text-sm"
            type="button"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
