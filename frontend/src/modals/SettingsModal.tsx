"use client"

import { useThemeStore, type Theme } from '../lib/store/theme';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const themes: { id: Theme; label: string; preview: React.ReactNode }[] = [
  {
    id: 'aesthetic',
    label: 'Aesthetic',
    preview: (
      <div className="w-full h-16 rounded-lg overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #c8dfc8 0%, #a8c8a8 100%)' }}>
        <div className="absolute inset-2 rounded-md" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.4) 100%)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.5)' }} />
        <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full" style={{ background: '#438951' }} />
      </div>
    ),
  },
  {
    id: 'notion-dark',
    label: 'Notion Dark',
    preview: (
      <div className="w-full h-16 rounded-lg overflow-hidden relative" style={{ background: '#191919' }}>
        <div className="absolute top-2 left-2 right-2 h-4 rounded-sm" style={{ background: '#252525', border: '1px solid rgba(255,255,255,0.07)' }} />
        <div className="absolute bottom-2 left-2 right-6 h-4 rounded-sm" style={{ background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.07)' }} />
        <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full" style={{ background: '#438951' }} />
      </div>
    ),
  },
];

export default function SettingsModal({ isOpen, onClose }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="settings-modal relative glass-panel rounded-xl border border-white/30 p-6 w-80 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Theme</h3>
          <div className="grid grid-cols-2 gap-3">
            {themes.map(({ id, label, preview }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={`flex flex-col gap-2 p-2 rounded-lg border-2 transition-all text-left ${
                  theme === id
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-transparent bg-white/20 hover:bg-white/40'
                }`}
              >
                {preview}
                <span className={`text-xs font-medium text-center w-full ${theme === id ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
