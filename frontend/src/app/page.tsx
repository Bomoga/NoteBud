'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';

export default function Home() {
  // Fetch data from FastAPI
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await apiClient.get('/health');
      return response.data;
    },
  });

  return (
    <>
      {/* Fixed forest background with misty overlays */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/forest-bg.png')] bg-center bg-cover bg-no-repeat">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(180,200,190,0.3)_0%,rgba(200,210,200,0.2)_50%,rgba(180,195,185,0.4)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(220,230,225,0.4)_0%,transparent_60%)]" />
        </div>
      </div>
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center p-24 text-slate-900">
      <div className="glass-panel text-center p-8 isolate aspect-video w-96 rounded-[32px]">
        <h1 className="text-4xl font-bold mb-4 text-emerald-700">NoteBud</h1>
        <p className="text-lg mb-8">AI-Powered Study Companion</p>
        
        <div className="p-4 bg-slate-100 rounded-md border border-slate-200">
          <h2 className="font-semibold mb-2">Backend Connection Status:</h2>
          
          {isLoading && <p className="text-amber-500 animate-pulse">Connecting to FastAPI...</p>}
          
          {isError && <p className="text-red-500">Failed to connect to backend.</p>}
          
          {data && (
            <div className="text-left font-mono text-sm">
              <p className="text-emerald-600">✅ {data?.message || "Connected to backend"}</p>
              <p>Database: {data?.database || "disconnected"}</p>
              <p>Status: {data?.status || "offline"}</p>
            </div>
          )}
        </div>
      </div>
      </main>
    </>
  );
}
