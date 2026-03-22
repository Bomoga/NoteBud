'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNotebooks, useCreateNotebook, useDeleteNotebook } from '../../hooks/useNotebooks';
import NotebookCard from '../../components/NotebookCard';
import NotebookGrid from '../../components/NotebookGrid';
import { MOCK_NOTEBOOKS } from '../../lib/api/mockNotebooks';

export default function BackpackPage() {
    const searchParams = useSearchParams();
    const useMock = searchParams.get('mock') === '1';
    const { data: notebooks, isLoading, isError } = useNotebooks();
    const displayNotebooks = useMock ? MOCK_NOTEBOOKS : notebooks;
    const createMutation = useCreateNotebook();
    const deleteMutation = useDeleteNotebook();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [title, setTitle] = useState('');
    const [courseCode, setCourseCode] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !courseCode.trim()) return;
        try {
            await createMutation.mutateAsync({ title: title.trim(), course_code: courseCode.trim() });
            setTitle('');
            setCourseCode('');
            setShowCreateForm(false);
        } catch {
            // Error handled by mutation / global error handler
        }
    };

    const handleDelete = (id: number) => {
        deleteMutation.mutate(id);
    };

    return (
        <div className="fixed inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-[url('/forest-bg.png')] bg-center bg-cover bg-no-repeat">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(180,200,190,0.3)_0%,rgba(200,210,200,0.2)_50%,rgba(180,195,185,0.4)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(220,230,225,0.4)_0%,transparent_60%)]" />
            </div>
            <main className="relative z-10 min-h-screen p-6 pt-24 sm:p-8 sm:pt-28">
                <div className="mx-auto max-w-6xl">
                    {useMock && (
                        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                            Showing mock data for layout testing. Remove <code className="rounded bg-amber-200/50 px-1 dark:bg-amber-800/50">?mock=1</code> from the URL for real data.
                        </div>
                    )}
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                            Backpack
                        </h1>
                        <button
                            type="button"
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                        >
                            {showCreateForm ? 'Cancel' : 'Create New Notebook'}
                        </button>
                    </div>

                    {showCreateForm && (
                        <form
                            onSubmit={handleCreate}
                            className="mb-8 rounded-xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/80"
                        >
                            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                                New notebook
                            </h2>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="flex-1">
                                    <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Title
                                    </label>
                                    <input
                                        id="title"
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Intro to Biology"
                                        required
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="courseCode" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Course code
                                    </label>
                                    <input
                                        id="courseCode"
                                        type="text"
                                        value={courseCode}
                                        onChange={(e) => setCourseCode(e.target.value)}
                                        placeholder="e.g. BIO 101"
                                        required
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                                >
                                    {createMutation.isPending ? 'Creating…' : 'Create'}
                                </button>
                            </div>
                            {createMutation.isError && (
                                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                                    Failed to create notebook. Please try again.
                                </p>
                            )}
                        </form>
                    )}

                    {isLoading && !useMock && (
                        <div className="flex min-h-[200px] items-center justify-center">
                            <p className="text-slate-600 dark:text-slate-400">Loading notebooks…</p>
                        </div>
                    )}

                    {isError && !useMock && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-900/20">
                            <p className="font-medium text-red-800 dark:text-red-300">Failed to load notebooks</p>
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                Check that the backend is running and try again.
                            </p>
                        </div>
                    )}

                    {!isLoading && (!isError || useMock) && displayNotebooks?.length === 0 && (
                        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 p-12 text-center dark:border-slate-600 dark:bg-slate-800/50">
                            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                                No notebooks yet
                            </p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Create your first notebook to get started.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(true)}
                                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                            >
                                Create New Notebook
                            </button>
                        </div>
                    )}

                    {!isLoading && displayNotebooks && displayNotebooks.length > 0 && (
                        <NotebookGrid>
                            {displayNotebooks.map((nb) => (
                                <NotebookCard
                                    key={nb.id}
                                    notebook={nb}
                                    onDelete={useMock ? undefined : handleDelete}
                                    isDeleting={deleteMutation.isPending && deleteMutation.variables === nb.id}
                                />
                            ))}
                        </NotebookGrid>
                    )}
                </div>
            </main>
        </div>
    );
}
