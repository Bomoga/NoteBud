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
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50 text-slate-900">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center">
        <h1 className="text-4xl font-bold mb-4 text-emerald-700">NoteBud</h1>
        <p className="text-lg mb-8">AI-Powered Study Companion</p>
        
        <div className="p-4 bg-slate-100 rounded-md border border-slate-200">
          <h2 className="font-semibold mb-2">Backend Connection Status:</h2>
          
          {isLoading && <p className="text-amber-500 animate-pulse">Connecting to FastAPI...</p>}
          
          {isError && <p className="text-red-500">Failed to connect to backend.</p>}
          
          {data && (
            <div className="text-left font-mono text-sm">
              <p className="text-emerald-600">✅ {data.message}</p>
              <p>Database: {data.database}</p>
              <p>Status: {data.status}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
