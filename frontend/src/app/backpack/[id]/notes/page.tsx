'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import NotesTabs from '../../../../components/NotesTabs';
import FileTree, { type FileTreeNode } from '../../../../components/FileTree';
import NotebookUploadAndCourseTagsModal from '../../../../modals/NotebookUploadAndCourseTagsModal';

const noteTree: FileTreeNode[] = [
  {
    id: 'folder-lecture',
    name: 'Lecture Notes',
    type: 'folder',
    children: [
      { id: 'file-week-1', name: 'Week 1.md', type: 'file' },
      { id: 'file-week-2', name: 'Week 2.md', type: 'file' },
      {
        id: 'folder-week-3',
        name: 'Week 3',
        type: 'folder',
        children: [{ id: 'file-week-3-summary', name: 'Summary.md', type: 'file' }],
      },
    ],
  },
  {
    id: 'folder-assignments',
    name: 'Assignments',
    type: 'folder',
    children: [
      { id: 'file-hw-1', name: 'Homework 1.md', type: 'file' },
      { id: 'file-hw-2', name: 'Homework 2.md', type: 'file' },
    ],
  },
];

export default function NotesForNotebookPage() {
  const { id } = useParams<{ id: string }>();

  const [leftPaneOpen, setLeftPaneOpen] = useState(true);
  const [rightPaneOpen, setRightPaneOpen] = useState(true);
  const [tabs, setTabs] = useState(['Notes-1', 'Notes-2', 'Notes-3']);
  const [uploadAndCourseTagsModalOpen, setUploadAndCourseTagsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('2026-03-24');

  const handleAddTab = () => {
    setTabs((prevTabs) => {
      const maxIndex = prevTabs.reduce((max, tabLabel) => {
        const match = tabLabel.match(/^Notes-(\d+)$/);
        if (!match) return max;
        const num = parseInt(match[1], 10);
        return Number.isNaN(num) ? max : Math.max(max, num);
      }, 0);
      const newTab = `Notes-${maxIndex + 1}`;
      setActiveTab(newTab);
      return [...prevTabs, newTab];
    });
    setUploadAndCourseTagsModalOpen(true);
  };

  const handleCloseUploadAndCourseTagsModal = () => {
    setUploadAndCourseTagsModalOpen(false);
  };

  const handleCloseTab = (tab: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t !== tab);
      if (activeTab === tab && next.length > 0) setActiveTab(next[0]);
      return next;
    });
  };

  const handleOpenChatPanel = () => {
    setRightPaneOpen(true);
  };

  const handleOpenLeftPane = () => {
    setLeftPaneOpen(true);
  };

  const handleCloseLeftPane = () => {
    setLeftPaneOpen(false);
  };

  const handleCloseChatPanel = () => {
    setRightPaneOpen(false);
  };

  return (
    <div className="fixed inset-0 z-0 overflow-hidden h-screen">
      <div className="absolute inset-0 bg-[url('/forest-bg.png')] bg-center bg-cover bg-no-repeat">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(180,200,190,0.3)_0%,rgba(200,210,200,0.2)_50%,rgba(180,195,185,0.4)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(220,230,225,0.4)_0%,transparent_60%)]" />
      </div>

      <main className="relative z-10 h-full overflow-hidden">
        <div className="mx-auto max-w-full flex flex-row flex-1 pt-16 h-full">
          {/* Filetree pane (left) */}
          <aside
            className={`overflow-hidden transition-[flex-basis] duration-200 flex-shrink-0 min-w-0 flex flex-col justify-end ${
              leftPaneOpen ? 'flex-[0_0_15%]' : 'flex-[0_0_0%]'
            }`}
          >
            {leftPaneOpen ? (
                <section className="flex flex-col h-full justify-between p-4">
                  <div className=" w-full h-full flex items-start mt-4 justify-start p-4">
                    {/* Filetree content */}
                    <FileTree nodes={noteTree} />
                  </div>
                </section>
            ) : null}
          </aside>

          {/* Modal overlay */}
          <NotebookUploadAndCourseTagsModal
            isOpen={uploadAndCourseTagsModalOpen}
            onClose={handleCloseUploadAndCourseTagsModal}
            notebookId={id}
          />

          {/* Notes pane center */}
          <section className="relative h-full flex-1 min-w-0 overflow-hidden flex flex-col">
            <NotesTabs
              tabs={tabs}
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              onAddTab={handleAddTab}
              onCloseTab={handleCloseTab}
              leftPaneOpen={leftPaneOpen}
              rightPaneOpen={rightPaneOpen}
              handleOpenChatPanel={handleOpenChatPanel}
              handleOpenLeftPane={handleOpenLeftPane}
              handleCloseLeftPane={handleCloseLeftPane}
              handleCloseChatPanel={handleCloseChatPanel}
            />


            <div className={`min-h-0 overflow-hidden flex flex-col h-full`}>
              <div className="p-2 glass-panel flex flex-col items-start justify-center backdrop-blur-[30px] border-2 border-gray-300 rounded-xl flex-1 min-h-0 w-full h-full overflow-auto">
                {/* Note content will be displayed here */}
                <div className="background-white/10 backdrop-blur-[30px] rounded-xl p-4 border-2 border-gray-300 w-full h-full" />
              </div>
            </div>
          </section>

          {/* Chat pane (right) */}
          <aside
            className={`overflow-hidden transition-[flex-basis] duration-200 flex-shrink-0 min-w-0 flex flex-col justify-end ${
              rightPaneOpen ? 'flex-[0_0_25%]' : 'flex-[0_0_0%]'
            }`}
          >
            {rightPaneOpen ? (
              <section className="flex flex-col h-full justify-between pl-2">
                <div></div>
                  <div className="glass-panel border-2 border-gray-300 rounded-xl flex flex-col h-1/4 w-full items-start justify-start p-4 bg-white/10 backdrop-blur-[30px]">
                    How can I help you today?
                    <div className="mt-4 background-white/10 backdrop-blur-[30px] rounded-xl p-4 border-2 border-gray-300 w-full h-full" />
                  </div>
              </section>
            ) : null}
          </aside>

        </div>
      </main>
    </div>
  );
}

