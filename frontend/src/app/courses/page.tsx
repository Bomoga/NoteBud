'use client';

import { useQuery } from '@tanstack/react-query';
import { getCourses } from '../../lib/api';

export default function CoursesPage() {
  const { data: courses = [], isLoading, isError } = useQuery({
    queryKey: ['courses'],
    queryFn: getCourses,
  });

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/forest-bg.png')] bg-center bg-cover bg-no-repeat">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(180,200,190,0.3)_0%,rgba(200,210,200,0.2)_50%,rgba(180,195,185,0.4)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(220,230,225,0.4)_0%,transparent_60%)]" />
      </div>
      <main className="relative z-10 min-h-screen p-6 pt-24 sm:p-8 sm:pt-28">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-2xl font-bold text-slate-900">Courses</h1>

          {isLoading && (
            <div className="flex min-h-[200px] items-center justify-center">
              <p className="text-slate-600">Loading courses…</p>
            </div>
          )}

          {isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <p className="font-medium text-red-800">Failed to load courses</p>
              <p className="mt-1 text-sm text-red-600">Check that the backend is running and try again.</p>
            </div>
          )}

          {!isLoading && !isError && courses.length === 0 && (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 p-12 text-center">
              <p className="text-lg font-medium text-slate-700">No courses found</p>
              <p className="mt-1 text-sm text-slate-500">Courses appear here once they are added to the graph.</p>
            </div>
          )}

          {courses.length > 0 && (
            <ul className="flex flex-col gap-3">
              {courses.map((course) => (
                <li
                  key={course.code}
                  className="glass-panel rounded-xl p-5 shadow-sm backdrop-blur-[30px]"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    {course.code}
                  </span>
                  <p className="mt-0.5 text-base font-medium text-slate-900">{course.name}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
