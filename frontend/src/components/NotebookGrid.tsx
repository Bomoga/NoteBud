'use client';

import React from 'react';

interface NotebookGridProps {
  children: React.ReactNode;
}

export default function NotebookGrid({ children }: NotebookGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}
