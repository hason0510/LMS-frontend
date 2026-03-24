import React, { useState } from 'react';

export default function CourseTabs({ tabs, defaultIndex = 0 }) {
  const [active, setActive] = useState(defaultIndex);

  return (
    <div>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav aria-label="Tabs" className="flex space-x-6 -mb-px">
          {tabs.map((tab, idx) => (
            <button
              key={tab.label}
              type="button"
              className={
                `shrink-0 px-1 py-4 text-base font-medium cursor-pointer ` +
                (active === idx
                  ? 'border-b-2 border-primary text-primary font-semibold'
                  : 'border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-200')
              }
              onClick={() => setActive(idx)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="py-6">
        {tabs[active]?.content}
      </div>
    </div>
  );
}
