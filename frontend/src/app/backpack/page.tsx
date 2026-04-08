'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/store/auth';
import { useNotebooks, useCreateNotebook, useDeleteNotebook } from '../../hooks/useNotebooks';
import NotebookCard from '../../components/NotebookCard';
import NotebookGrid from '../../components/NotebookGrid';
import { PlusIcon, ShareIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import NotebookGraph from '../../components/NotebookGraph';
import MiniCalendar from '../../components/MiniCalendar';
import { useAllLinks } from '../../hooks/useLinks';

const DEFAULT_SEMESTER = 'Spring 2026';
const STORAGE_KEY = 'notebud_current_semester';
const SEMESTER_ORDER = ['Spring', 'Summer', 'Fall'];

function semesterSortKey(semester: string): number {
    const [term, year] = semester.split(' ');
    const termIndex = SEMESTER_ORDER.indexOf(term);
    return parseInt(year ?? '0') * 10 + (termIndex === -1 ? 0 : termIndex);
}

export default function BackpackPage() {
    const router = useRouter();
    const token = useAuthStore((s) => s.token);

    useEffect(() => {
        if (!token) router.replace('/');
    }, [token, router]);

    const { data: displayNotebooks, isLoading, isError } = useNotebooks();
    const { data: allLinks = [] } = useAllLinks();

    // Resizable left panel (horizontal)
    const [leftWidth, setLeftWidth] = useState(440);
    const colDragging = useRef(false);
    const colStartX = useRef(0);
    const colStartWidth = useRef(0);

    const onDragStart = useCallback((e: React.MouseEvent) => {
        colDragging.current = true;
        colStartX.current = e.clientX;
        colStartWidth.current = leftWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMove = (ev: MouseEvent) => {
            if (!colDragging.current) return;
            const delta = ev.clientX - colStartX.current;
            const next = Math.min(700, Math.max(260, colStartWidth.current + delta));
            setLeftWidth(next);
        };
        const onUp = () => {
            colDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [leftWidth]);

    // Resizable calendar / neural map (vertical)
    const [calendarHeight, setCalendarHeight] = useState(340);
    const rowDragging = useRef(false);
    const rowStartY = useRef(0);
    const rowStartHeight = useRef(0);

    const onRowDragStart = useCallback((e: React.MouseEvent) => {
        rowDragging.current = true;
        rowStartY.current = e.clientY;
        rowStartHeight.current = calendarHeight;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';

        const onMove = (ev: MouseEvent) => {
            if (!rowDragging.current) return;
            const delta = ev.clientY - rowStartY.current;
            const next = Math.min(600, Math.max(180, rowStartHeight.current + delta));
            setCalendarHeight(next);
        };
        const onUp = () => {
            rowDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [calendarHeight]);
    const createMutation = useCreateNotebook();
    const deleteMutation = useDeleteNotebook();
    const [currentSemester, setCurrentSemester] = useState<string>(
        () => (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) ?? DEFAULT_SEMESTER
    );
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [title, setTitle] = useState('');
    const [courseCode, setCourseCode] = useState('');
    const [description, setDescription] = useState('');
    const [semester, setSemester] = useState(() => currentSemester);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !courseCode.trim()) return;
        try {
            await createMutation.mutateAsync({
                title: title.trim(),
                course_code: courseCode.trim() || 'UC',
                description: description.trim() || null,
                semester: semester.trim() || currentSemester,
            });
            setTitle(''); setCourseCode(''); setDescription(''); setSemester(currentSemester);
            setShowCreateForm(false);
        } catch { /* handled by mutation */ }
    };

    const handleDelete = (id: string) => deleteMutation.mutate(id);
    const handleSetCurrent = (sem: string) => {
        setCurrentSemester(sem);
        localStorage.setItem(STORAGE_KEY, sem);
    };

    const grouped = React.useMemo(() => {
        if (!displayNotebooks) return [];
        const map = new Map<string, typeof displayNotebooks>();
        for (const nb of displayNotebooks) {
            const key = nb.semester ?? currentSemester;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(nb);
        }
        return Array.from(map.entries()).sort(([a], [b]) => semesterSortKey(b) - semesterSortKey(a));
    }, [displayNotebooks]);

    if (!token) return null;

    return (
        <div className="fixed inset-0 overflow-hidden">
            {/* Background */}
            <div className="forest-background absolute inset-0 bg-[url('/forest-bg.png')] bg-center bg-cover bg-no-repeat">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(180,200,190,0.3)_0%,rgba(200,210,200,0.2)_50%,rgba(180,195,185,0.4)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(220,230,225,0.4)_0%,transparent_60%)]" />
            </div>

            {/* Two-column layout */}
            <div className="relative z-10 flex h-full p-3 pt-[4.75rem] gap-0">

                {/* ── Left panel: Calendar + Graph ── */}
                <div
                    className="hidden lg:flex flex-shrink-0 flex-col h-full"
                    style={{ width: leftWidth }}
                >
                    {/* Calendar */}
                    <div
                        className="glass-panel border border-white/30 rounded-xl flex flex-col flex-shrink-0 overflow-hidden"
                        style={{ height: calendarHeight }}
                    >
                        <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-shrink-0">
                            <CalendarDaysIcon className="size-4 text-slate-500" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Calendar</span>
                        </div>
                        <div className="flex-1 min-h-0">
                            <MiniCalendar />
                        </div>
                    </div>

                    {/* Vertical drag handle */}
                    <div
                        onMouseDown={onRowDragStart}
                        className="h-3 flex-shrink-0 flex items-center justify-center cursor-row-resize group"
                    >
                        <div className="h-0.5 w-12 rounded-full bg-white/30 group-hover:bg-white/60 transition-colors" />
                    </div>

                    {/* Notebook graph */}
                    <div className="glass-panel border border-white/30 rounded-xl flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex items-center gap-2 px-4 pt-4 pb-2 flex-shrink-0">
                            <ShareIcon className="size-4 text-slate-500" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notebook Neural Map</span>
                        </div>
                        <NotebookGraph notebooks={displayNotebooks ?? []} links={allLinks} />
                    </div>
                </div>

                {/* ── Drag handle ── */}
                <div
                    onMouseDown={onDragStart}
                    className="hidden lg:flex w-3 flex-shrink-0 items-center justify-center cursor-col-resize group"
                >
                    <div className="w-0.5 h-12 rounded-full bg-white/30 group-hover:bg-white/60 transition-colors" />
                </div>

                {/* ── Right panel: Notebooks ── */}
                <div className="flex-1 flex flex-col min-w-0 h-full">
                    <div className="glass-panel border border-white/30 rounded-xl flex flex-col h-full overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 flex-shrink-0">
                            <h1 className="text-xl font-bold text-slate-900">My notebooks</h1>
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(!showCreateForm)}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                            >
                                <PlusIcon className="size-4" />
                                {showCreateForm ? 'Cancel' : 'Create new'}
                            </button>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">

                            {/* Create form */}
                            {showCreateForm && (
                                <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-white/30 bg-white/40 backdrop-blur-sm p-5">
                                    <h2 className="mb-4 text-base font-semibold text-slate-900">New notebook</h2>
                                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                                        <div className="flex-1">
                                            <label className="mb-1 block text-xs font-medium text-slate-700">Title</label>
                                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                                                placeholder="e.g. Intro to Biology" required
                                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="mb-1 block text-xs font-medium text-slate-700">Course code <span className="text-slate-400">(optional)</span></label>
                                            <input type="text" value={courseCode} onChange={(e) => setCourseCode(e.target.value)}
                                                placeholder="e.g. BIO 101 — leave blank for UC"
                                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="mb-1 block text-xs font-medium text-slate-700">Semester</label>
                                            <input type="text" value={semester} onChange={(e) => setSemester(e.target.value)}
                                                placeholder="e.g. Spring 2026"
                                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="mb-1 block text-xs font-medium text-slate-700">Description <span className="text-slate-400">(optional)</span></label>
                                        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                                            placeholder="e.g. Notes on cell structure and genetics" rows={2}
                                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="submit" disabled={createMutation.isPending}
                                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                                            {createMutation.isPending ? 'Creating…' : 'Create'}
                                        </button>
                                    </div>
                                    {createMutation.isError && (
                                        <p className="mt-3 text-sm text-red-600">Failed to create notebook. Please try again.</p>
                                    )}
                                </form>
                            )}

                            {/* States */}
                            {isLoading && (
                                <div className="flex min-h-[200px] items-center justify-center">
                                    <p className="text-slate-500">Loading notebooks…</p>
                                </div>
                            )}
                            {isError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                                    <p className="font-medium text-red-800">Failed to load notebooks</p>
                                    <p className="mt-1 text-sm text-red-600">Check that the backend is running and try again.</p>
                                </div>
                            )}
                            {displayNotebooks?.length === 0 && !isLoading && !isError && (
                                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/30 p-12 text-center">
                                    <p className="text-base font-medium text-slate-700">No notebooks yet</p>
                                    <p className="mt-1 text-sm text-slate-500">Create your first notebook to get started.</p>
                                    <button type="button" onClick={() => setShowCreateForm(true)}
                                        className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                                        Create new notebook
                                    </button>
                                </div>
                            )}

                            {/* Semester groups */}
                            {grouped.map(([sem, notebooks]) => (
                                <section key={sem} className="mb-8">
                                    <div className="group mb-3 flex items-center gap-3">
                                        <h2 className="text-sm font-semibold text-slate-700">{sem}</h2>
                                        <span className="text-xs text-slate-400">{notebooks.length} notebook{notebooks.length !== 1 ? 's' : ''}</span>
                                        {sem === currentSemester ? (
                                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700">Current</span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleSetCurrent(sem)}
                                                className="opacity-0 group-hover:opacity-100 rounded-full border border-slate-300/60 px-2 py-0.5 text-xs text-slate-400 hover:text-emerald-700 hover:border-emerald-400 transition-all"
                                            >
                                                Set as current
                                            </button>
                                        )}
                                    </div>
                                    <NotebookGrid>
                                        {notebooks.map((nb) => (
                                            <NotebookCard
                                                key={nb.id}
                                                notebook={nb}
                                                onDelete={handleDelete}
                                                isDeleting={deleteMutation.isPending && deleteMutation.variables === nb.id}
                                            />
                                        ))}
                                    </NotebookGrid>
                                </section>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
