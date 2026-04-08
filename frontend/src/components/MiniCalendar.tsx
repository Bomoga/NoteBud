'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEvents, useCreateEvent, useDeleteEvent } from '../hooks/useEvents';
import type { EventType } from '../lib/api/events';

const DOT_COLORS: Record<EventType, string> = {
  due_date: 'bg-rose-400',
  exam:     'bg-amber-400',
  holiday:  'bg-emerald-400',
  other:    'bg-violet-400',
};

const BADGE_COLORS: Record<EventType, string> = {
  due_date: 'bg-rose-100 text-rose-700',
  exam:     'bg-amber-100 text-amber-700',
  holiday:  'bg-emerald-100 text-emerald-700',
  other:    'bg-violet-100 text-violet-700',
};

const TYPE_LABELS: Record<EventType, string> = {
  due_date: 'Due date',
  exam:     'Exam',
  holiday:  'Holiday',
  other:    'Other',
};

/** Returns "YYYY-MM-DD" from a local Date — avoids UTC-offset shift of .toISOString(). */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" as local midnight to avoid timezone display issues. */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function MiniCalendar() {
  const todayStr = toLocalDateStr(new Date());

  const [viewDate, setViewDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(todayStr);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<EventType>('due_date');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(todayStr);

  const { data: events = [] } = useEvents();
  const createMutation = useCreateEvent();
  const deleteMutation = useDeleteEvent();

  // Map date string → events for that day
  const eventMap = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const ev of events) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return map;
  }, [events]);

  // Build the grid: array of "YYYY-MM-DD" | null
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (string | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(toLocalDateStr(new Date(year, month, d)));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [viewDate]);

  // Upcoming events in the next 14 days (for the default "no selection" view)
  const upcomingEvents = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 14);
    const limitStr = toLocalDateStr(limit);
    return events.filter(e => e.date >= todayStr && e.date <= limitStr).slice(0, 6);
  }, [events, todayStr]);

  const selectedEvents = selectedDay ? (eventMap.get(selectedDay) ?? []) : [];

  const prevMonth = () =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const openForm = (day?: string) => {
    setFormDate(day ?? todayStr);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    await createMutation.mutateAsync({
      title: formTitle.trim(),
      date: formDate,
      event_type: formType,
      description: formDesc.trim() || null,
    });
    setFormTitle('');
    setFormDesc('');
    setFormType('due_date');
    setShowForm(false);
    setSelectedDay(formDate);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Month navigation ── */}
      <div className="flex items-center px-3 pt-1 pb-1 gap-1 flex-shrink-0">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-black/5 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="size-3.5 text-slate-500" />
        </button>
        <span className="flex-1 text-center text-xs font-semibold text-slate-700">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-black/5 transition-colors"
          aria-label="Next month"
        >
          <ChevronRightIcon className="size-3.5 text-slate-500" />
        </button>
        <button
          onClick={() => openForm(selectedDay ?? undefined)}
          className="p-1 rounded hover:bg-emerald-50 transition-colors"
          title="Add event"
        >
          <PlusIcon className="size-3.5 text-emerald-600" />
        </button>
      </div>

      {/* ── Day-of-week headers ── */}
      <div className="grid grid-cols-7 px-2 flex-shrink-0">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div className="grid grid-cols-7 px-2 flex-shrink-0">
        {calendarDays.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const isToday = day === todayStr;
          const isSelected = day === selectedDay;
          const dayEvents = eventMap.get(day) ?? [];
          const dayNum = parseLocalDate(day).getDate();
          return (
            <button
              key={day}
              onClick={() => {
                setSelectedDay(day === selectedDay ? null : day);
                setShowForm(false);
              }}
              className={`
                relative flex flex-col items-center py-0.5 mx-0.5 my-0.5 rounded-md transition-colors
                ${isSelected ? 'bg-emerald-500/15' : 'hover:bg-black/5'}
              `}
            >
              <span
                className={`
                  text-[11px] leading-none font-medium w-5 h-5 flex items-center justify-center rounded-full
                  ${isToday
                    ? 'bg-emerald-500 text-white'
                    : isSelected
                    ? 'text-emerald-700'
                    : 'text-slate-600'}
                `}
              >
                {dayNum}
              </span>
              {/* Event dots */}
              <div className="flex gap-0.5 mt-0.5 h-1">
                {dayEvents.slice(0, 3).map(ev => (
                  <span
                    key={ev.id}
                    className={`w-1 h-1 rounded-full ${DOT_COLORS[ev.event_type]}`}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-white/40 mx-3 mt-1 mb-1 flex-shrink-0" />

      {/* ── Bottom section: form | selected day events | upcoming ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-0">

        {showForm ? (
          /* Add-event form */
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                New event
              </span>
              <button type="button" onClick={() => setShowForm(false)}>
                <XMarkIcon className="size-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Event title"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              required
              className="w-full text-xs rounded border border-slate-200 px-2 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 bg-white/60"
            />

            <div className="flex gap-1.5">
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                required
                className="flex-1 text-xs rounded border border-slate-200 px-2 py-1.5 text-slate-800 focus:outline-none focus:border-emerald-400 bg-white/60"
              />
              <select
                value={formType}
                onChange={e => setFormType(e.target.value as EventType)}
                className="flex-1 text-xs rounded border border-slate-200 px-2 py-1.5 text-slate-800 focus:outline-none focus:border-emerald-400 bg-white/60"
              >
                <option value="due_date">Due date</option>
                <option value="exam">Exam</option>
                <option value="holiday">Holiday</option>
                <option value="other">Other</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Description (optional)"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              className="w-full text-xs rounded border border-slate-200 px-2 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 bg-white/60"
            />

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full text-xs rounded bg-emerald-500 text-white py-1.5 hover:bg-emerald-600 disabled:opacity-50 transition-colors font-medium"
            >
              {createMutation.isPending ? 'Saving…' : 'Add event'}
            </button>
          </form>

        ) : selectedDay ? (
          /* Selected day events */
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {parseLocalDate(selectedDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <button
                onClick={() => openForm(selectedDay)}
                className="flex items-center gap-0.5 text-[10px] text-emerald-600 hover:text-emerald-700"
              >
                <PlusIcon className="size-2.5" />
                Add
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-3">No events</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedEvents.map(ev => (
                  <li key={ev.id} className="flex items-center gap-1.5 group">
                    <span className={`size-1.5 rounded-full flex-shrink-0 ${DOT_COLORS[ev.event_type]}`} />
                    <span className="text-[11px] text-slate-700 flex-1 truncate">{ev.title}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${BADGE_COLORS[ev.event_type]}`}>
                      {TYPE_LABELS[ev.event_type]}
                    </span>
                    <button
                      onClick={() => deleteMutation.mutate(ev.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-400 transition-all"
                      aria-label="Delete event"
                    >
                      <XMarkIcon className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>

        ) : (
          /* Upcoming events (no day selected) */
          <>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Upcoming
            </span>
            {upcomingEvents.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-3">No upcoming events</p>
            ) : (
              <ul className="space-y-1.5">
                {upcomingEvents.map(ev => (
                  <li key={ev.id} className="flex items-center gap-1.5">
                    <span className={`size-1.5 rounded-full flex-shrink-0 ${DOT_COLORS[ev.event_type]}`} />
                    <span className="text-[11px] text-slate-400 flex-shrink-0 w-9">
                      {parseLocalDate(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[11px] text-slate-700 flex-1 truncate">{ev.title}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${BADGE_COLORS[ev.event_type]}`}>
                      {TYPE_LABELS[ev.event_type]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
