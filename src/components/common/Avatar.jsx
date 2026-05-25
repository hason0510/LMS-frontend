import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';

export default function Avatar({
  src,
  alt,
  className = "",
  sizeClass = "size-10",
  initialsClass = "text-lg",
}) {
  const shellClassName = `rounded-full flex items-center justify-center overflow-hidden ${sizeClass} ${className}`.trim();

  if (src) {
    return (
      <div className={`bg-gray-200 dark:bg-gray-700 ${shellClassName}`}>
        <img src={src} alt={alt || 'Avatar'} className="w-full h-full object-cover rounded-full" />
      </div>
    );
  }

  if (alt) {
    return (
      <div className={`bg-primary text-white ${shellClassName}`}>
        <span className={`font-bold uppercase ${initialsClass}`}>
          {alt.charAt(0)}
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-gray-200 dark:bg-gray-700 ${shellClassName}`}>
      <UserIcon className="h-6 w-6 text-gray-500 dark:text-gray-300" />
    </div>
  );
}
