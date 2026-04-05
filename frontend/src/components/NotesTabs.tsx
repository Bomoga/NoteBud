'use client';

import React from 'react';
import { ChatBubbleLeftIcon, PlusIcon, QueueListIcon, ArrowLeftStartOnRectangleIcon, XMarkIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';

export interface NoteTab {
    id: string;
    title: string;
}

interface NotesTabsProps {
    tabs: NoteTab[];
    activeTab: string;
    onSelectTab: (id: string) => void;
    onAddTab: () => void;
    onCloseTab: (id: string) => void;
    rightPaneOpen: boolean;
    leftPaneOpen: boolean;
    handleOpenLeftPane: () => void;
    handleCloseLeftPane: () => void;
    handleOpenChatPanel: () => void;
    handleCloseChatPanel: () => void;
}

export default function NotesTabs({
    tabs,
    activeTab,
    onSelectTab,
    onAddTab,
    onCloseTab,
    rightPaneOpen,
    leftPaneOpen,
    handleOpenLeftPane,
    handleOpenChatPanel,
    handleCloseLeftPane,
    handleCloseChatPanel,
}: NotesTabsProps) {
    return (
        <div className="border-b border-white/40 ml-4 mr-4 pt-1.5 mt-2">
            <div className="flex items-end justify-between gap-1 overflow-x-auto">
                <div className="flex items-center gap-1">
                {!leftPaneOpen ? (
                    <button type="button" onClick={handleOpenLeftPane} aria-label="Open left pane" className="rounded-full mr-2 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <QueueListIcon className="h-6 w-6" />
                    </button>
                ) : 
                <button type="button" onClick={handleCloseLeftPane} aria-label="Close left pane" className="rounded-full mr-2 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <ArrowLeftStartOnRectangleIcon className="h-6 w-6" />
                    </button>
                }
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <div
                            key={tab.id}
                            className={`glass-panel rounded-t-xl backdrop-blur-[30px] group inline-flex shrink-0 items-center gap-1 px-3 py-1.5 text-sm ${isActive ? 'text-slate-800' : 'text-slate-600 hover:text-slate-800'}`}
                        >
                            <button
                                type="button"
                                onClick={() => onSelectTab(tab.id)}
                                className="max-w-[150px] truncate"
                            >
                                {tab.title}
                            </button>
                            <button
                                type="button"
                                aria-label={`Close ${tab.title}`}
                                onClick={() => onCloseTab(tab.id)}
                                className="opacity-60 hover:opacity-100 focus:outline-none focus:opacity-100"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
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
                {!rightPaneOpen ? (
                    <button type="button" onClick={handleOpenChatPanel} aria-label="Open chat panel" className="rounded-full p-2 mr-2 text-slate-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <ChatBubbleLeftIcon className="h-6 w-6" />
                    </button>
                ) : 
                <button type="button" onClick={handleCloseChatPanel} aria-label="Close chat panel" className="rounded-full p-2 mr-2 text-slate-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <ArrowRightStartOnRectangleIcon className="h-6 w-6" />
                    </button>
                }
            </div>
        </div>
    );
}
