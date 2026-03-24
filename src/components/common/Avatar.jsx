import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';

export default function Avatar({ src, alt, className }) {
  console.log("Avatar props - src:", src, "alt:", alt);
  // Nếu có src thì hiển thị ảnh
  if (src) {
    return (
      <div className={`bg-gray-200 dark:bg-gray-700 rounded-full w-10 h-10 flex items-center justify-center overflow-hidden ${className || ''}`}>
        <img src={src} alt={alt || 'Avatar'} className="w-full h-full object-cover rounded-full" />
      </div>
    );
  }

  // Nếu không có src nhưng có alt (tên), hiển thị chữ cái đầu trên nền primary
  if (alt) {
    return (
      <div className={`bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center overflow-hidden ${className || ''}`}>
        <span className="font-bold text-lg uppercase">
          {alt.charAt(0)}
        </span>
      </div>
    );
  }

  // Nếu không có cả hai, hiển thị icon mặc định
  return (
    <div className={`bg-gray-200 dark:bg-gray-700 rounded-full w-10 h-10 flex items-center justify-center overflow-hidden ${className || ''}`}>
      <UserIcon className="h-6 w-6 text-gray-500 dark:text-gray-300" />
    </div>
  );
}
