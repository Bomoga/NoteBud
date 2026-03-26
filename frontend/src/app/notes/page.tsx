'use client';

import React, { useState } from 'react';
import { ChatBubbleLeftIcon, ArrowLeftStartOnRectangleIcon } from '@heroicons/react/24/outline';

export default function NotesPage() {
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden h-screen">
      <div className="absolute inset-0 bg-[url('/forest-bg.png')] bg-center bg-cover bg-no-repeat">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(180,200,190,0.3)_0%,rgba(200,210,200,0.2)_50%,rgba(180,195,185,0.4)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(220,230,225,0.4)_0%,transparent_60%)]" />
      </div>

      <main className="relative z-10 h-full overflow-hidden">
        <div className="mx-auto max-w-full flex flex-row flex-1 pt-16 h-full">
          {/* Chat Pane (left) */}
          <aside
            className={`border-r border-gray-200 overflow-hidden transition-[flex-basis]  duration-200 flex-shrink-0 min-w-0 flex flex-col justify-end ${
              chatOpen ? 'flex-[0_0_33.333%]' : 'flex-[0_0_0%] border-r-0 '
            }`}
          >
            {/* Chat Open State*/}
            {chatOpen && (
              <div className="flex items-center justify-end p-4">
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  aria-label="Close chat panel"
                  className="rounded-full p-2 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <ArrowLeftStartOnRectangleIcon className="h-6 w-6" />
                </button>
              </div>
            )}

            <div className="h-1/2 rounded-md p-6 w-full">
              {/* Chat content goes here */}
              <div className="glass backdrop-blur-[30px] flex flex-col items-end justify-center h-full mx-auto p-6 w-full rounded-md">
                <h1 className="text-2xl font-bold">Chat</h1>
                <p className="text-gray-500">This is the chat content. It will be displayed here.</p>
              </div>
            </div>
          </aside>

          {/* Notes Pane (right) */}
          <section className="h-full flex-1 min-w-0 border-r border-gray-200 overflow-hidden flex flex-col">
            {/* Chat Closed State*/}
            {!chatOpen && (
              <div className="flex items-center p-4 justify-start">
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  aria-label="Open chat panel"
                  className="rounded-full p-2 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <ChatBubbleLeftIcon className="h-6 w-6" />
                </button>
              </div>
            )}

            <div className={`${chatOpen ? 'pl-4 pt-14' : 'pl-16 pt-2'} pr-4 min-h-0 overflow-hidden flex flex-col h-full pb-6`}>
              {/* Notes content goes here */}
              <div className="glass p-4 flex flex-col items-start justify-center backdrop-blur-[30px] border-2 border-gray-300 rounded-md flex-1 min-h-0 w-full h-full overflow-auto">
                <h1 className="text-2xl font-bold mb-4">Notes</h1>
                <p className="text-gray-500 mb-4">This is the notes content. It will be displayed here.</p>
                <p className="text-gray-500">This is the notes content. It will be displayed here.</p>
                <p className="text-gray-500">This is the notes content. It will be displayed here.</p>
                <p className="text-gray-500">This is the notes content. It will be displayed here.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
