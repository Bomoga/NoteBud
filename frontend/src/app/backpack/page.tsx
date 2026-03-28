'use client';

import React, { useState } from 'react';
import {
    useNotebooks,
    useCreateNotebook,
    useDeleteNotebook,
} from '../../hooks/useNotebooks';
import NotebookCard from '../../components/NotebookCard';
import NotebookGrid from '../../components/NotebookGrid';

export default function BackpackPage() {
    const { data: displayNotebooks, isLoading, isError } = useNotebooks();
    const createMutation = useCreateNotebook();
    const deleteMutation = useDeleteNotebook();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [title, setTitle] = useState('');
    const [courseCode, setCourseCode] = useState('');
    const [description, setDescription] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !courseCode.trim()) return;

        try {
            await createMutation.mutateAsync({ title: title.trim(), course_code: courseCode.trim(), description: description.trim() || null });
            setTitle('');
            setCourseCode('');
            setDescription('');
            setShowCreateForm(false);
        } catch {
            // Error handled by mutation / global error handler
        }
    };

    const handleDelete = (id: string) => {
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
                    <div className="mb-6 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 hover:cursor-pointer"
                        >
                            {showCreateForm ? 'Cancel' : 'Create New'}
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
                            <div className="mb-3">
                                    <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Description <span className="text-slate-400">(optional)</span>
                                    </label>
                                    <textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="e.g. Notes on cell structure and genetics"
                                        rows={2}
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500"
                                    />
                                </div>
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

                    {isLoading && (
                        <div className="flex min-h-[200px] items-center justify-center">
                            <p className="text-slate-600 dark:text-slate-400">Loading notebooks…</p>
                        </div>
                    )}

                    {isError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-900/20">
                            <p className="font-medium text-red-800 dark:text-red-300">Failed to load notebooks</p>
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                Check that the backend is running and try again.
                            </p>
                        </div>
                    )}

                    {displayNotebooks?.length === 0 && !isLoading && !isError && (
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

                    {displayNotebooks && displayNotebooks.length > 0 && (
                        <NotebookGrid>
                            {displayNotebooks.map((nb) => (
                                <NotebookCard
                                    key={nb.id}
                                    notebook={nb}
                                    onDelete={handleDelete}
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
