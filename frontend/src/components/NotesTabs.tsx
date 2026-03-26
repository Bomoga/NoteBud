'use client';

import React from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface NotesTabsProps {
  tabs: string[];
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onAddTab: () => void;
  onCloseTab: (tab: string) => void;
  chatOpen: boolean;
}

export default function NotesTabs({
  tabs,
  activeTab,
  onSelectTab,
  onAddTab,
  onCloseTab,
  chatOpen,
}: NotesTabsProps) {
  return (
    <div className={`border-b border-white/40 ${chatOpen ? 'ml-4' : 'ml-14'} mr-4 pt-1.5 mt-4
    `}>
      <div className="flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onSelectTab(tab)}
              className={`glass-panel rounded-t-xl backdrop-blur-[30px] group inline-flex shrink-0 items-center gap-1 px-3 py-1.5 text-sm ${
                isActive ? 'text-slate-800' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <span className="max-w-[150px] truncate">{tab}</span>
              <XMarkIcon
                className="h-4 w-4 opacity-60 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab);
                }}
              />
            </button>
          );
        })}

        <button
          type="button"
          onClick={onAddTab}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/15 text-slate-700 hover:bg-white/30"
          aria-label="Add note tab"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
