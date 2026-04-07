"use client"

import { useState, useRef, useEffect } from 'react'
import { Cog6ToothIcon, ChevronDownIcon, UserCircleIcon, SwatchIcon, ArrowRightStartOnRectangleIcon, CameraIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/20/solid'
import { useThemeStore, type Theme } from '../lib/store/theme'
import { useAuthStore } from '../lib/store/auth'
import { useQueryClient } from '@tanstack/react-query'
import { abortAllInFlightRequests, disableAuthHeadersFor } from '../lib/api/client'
import { uploadAvatar, deleteAvatar } from '../lib/api/users'
import { useAvatarUrl } from '../hooks/useAvatar'

const themes: { id: Theme; label: string; description: string; preview: React.ReactNode }[] = [
  {
    id: 'aesthetic',
    label: 'Aesthetic',
    description: 'Frosted glass & forest',
    preview: (
      <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #c8dfc8 0%, #a8c8a8 100%)' }}>
        <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.35) 100%)' }} />
      </div>
    ),
  },
  {
    id: 'notion-dark',
    label: 'Notion Dark',
    description: 'Clean dark workspace',
    preview: (
      <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 flex flex-col gap-0.5 p-1" style={{ background: '#191919' }}>
        <div className="w-full h-2 rounded-sm" style={{ background: '#2f2f2f' }} />
        <div className="w-3/4 h-2 rounded-sm" style={{ background: '#252525' }} />
      </div>
    ),
  },
]

export default function SettingsDropdown() {
  const [open, setOpen] = useState(false)
  const [themeExpanded, setThemeExpanded] = useState(false)
  const [accountExpanded, setAccountExpanded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const username = useAuthStore((s) => s.username)
  const clearSession = useAuthStore((s) => s.clearSession)
  const queryClient = useQueryClient()
  const { blobUrl, refetch: refetchAvatar } = useAvatarUrl()

  const displayInitial = username?.trim()?.charAt(0).toUpperCase() || '?'

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setThemeExpanded(false)
        setAccountExpanded(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleLogout = () => {
    queryClient.cancelQueries()
    queryClient.clear()
    abortAllInFlightRequests()
    clearSession()
    disableAuthHeadersFor(10000)
    window.location.assign('/login')
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      await uploadAvatar(file)
      refetchAvatar()
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setUploading(true)
    try {
      await deleteAvatar()
      refetchAvatar()
    } finally {
      setUploading(false)
    }
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); if (open) { setThemeExpanded(false); setAccountExpanded(false) } }}
        className="relative flex items-center justify-center rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
        aria-label="Open settings"
      >
        <span className="absolute -inset-1.5" />
        <Cog6ToothIcon className="size-6" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 z-50 rounded-xl shadow-xl overflow-hidden glass-panel border border-white/30">

          {/* Theme section */}
          <button
            type="button"
            onClick={() => setThemeExpanded((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/20 transition-colors"
          >
            <SwatchIcon className="size-4 text-slate-500 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium text-slate-700">Theme</span>
            <ChevronDownIcon className={`size-4 text-slate-400 transition-transform ${themeExpanded ? 'rotate-180' : ''}`} />
          </button>

          {themeExpanded && (
            <div className="border-t border-white/20 px-3 py-2 flex flex-col gap-1">
              {themes.map(({ id, label, description, preview }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors ${
                    theme === id ? 'bg-emerald-50/60' : 'hover:bg-white/30'
                  }`}
                >
                  {preview}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${theme === id ? 'text-emerald-700' : 'text-slate-700'}`}>{label}</div>
                    <div className="text-xs text-slate-400 truncate">{description}</div>
                  </div>
                  {theme === id && <CheckIcon className="size-4 text-emerald-600 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-white/20" />

          {/* Account section */}
          <button
            type="button"
            onClick={() => setAccountExpanded((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/20 transition-colors"
          >
            <UserCircleIcon className="size-4 text-slate-500 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium text-slate-700">Account settings</span>
            <ChevronDownIcon className={`size-4 text-slate-400 transition-transform ${accountExpanded ? 'rotate-180' : ''}`} />
          </button>

          {accountExpanded && (
            <div className="border-t border-white/20 px-4 py-3 flex flex-col gap-3">
              {/* Avatar */}
              <div className="flex items-center gap-3">
                <div className="relative group flex-shrink-0">
                  <div className="size-14 rounded-full overflow-hidden bg-emerald-600 flex items-center justify-center">
                    {blobUrl ? (
                      <img src={blobUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-semibold text-white">{displayInitial}</span>
                    )}
                  </div>
                  {/* Camera overlay */}
                  <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {uploading
                      ? <div className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      : <CameraIcon className="size-4 text-white" />
                    }
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{username}</p>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={!blobUrl || uploading}
                    className="text-xs text-slate-400 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Remove photo
                  </button>
                </div>
              </div>

              {/* Sign out */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50/60 transition-colors"
              >
                <ArrowRightStartOnRectangleIcon className="size-4 flex-shrink-0" />
                Sign out
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
