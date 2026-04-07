"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { Bars3Icon, XMarkIcon, HomeIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../lib/store/auth'
import { getNotebook } from '../lib/api'
import { useQuery } from '@tanstack/react-query'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import SettingsDropdown from './SettingsDropdown'
import { useAvatarUrl } from '../hooks/useAvatar'

const navLinks = [
  { href: '/', label: 'Home', Icon: HomeIcon, protected: false },
  { href: '/backpack', label: 'Backpack', Icon: BookOpenIcon, protected: true },
];

export default function NavBar() {
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const username = useAuthStore((s) => s.username);

  const displayInitial = username?.trim()?.charAt(0).toUpperCase() || '?';
  const { blobUrl: avatarUrl } = useAvatarUrl();

  // Extract notebook ID from /backpack/[id]/... routes
  const notebookIdMatch = pathname.match(/^\/backpack\/([^/]+)/);
  const notebookId = notebookIdMatch?.[1];

  const { data: currentNotebook } = useQuery({
    queryKey: ['notebook', notebookId],
    queryFn: () => getNotebook(notebookId!),
    enabled: !!notebookId && !!token,
    staleTime: 60 * 1000,
  });

  return (
    <Disclosure as="nav" className="relative z-20 glass-panel backdrop-blur-[30px]">
      <div className="mx-auto max-w-8xl sm:px-6 lg:px-12">
        <div className="flex h-16 justify-between">
          <div className="flex px-4 lg:px-6">
            <div className="flex shrink-0 items-center">
              <img
                alt="NoteBud Logo"
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=emerald&shade=600"
                className="h-8 w-auto"
              />
            </div>
            <div className="hidden lg:ml-6 lg:flex lg:items-center lg:gap-3">
              {navLinks.map(({ href, label, Icon, protected: isProtected }, i) => {
                const linkPath = href.split('?')[0]
                const isActive = href !== '#' && pathname === linkPath
                const activeClass = 'border-emerald-600 text-gray-900'
                const defaultClass = 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                const resolvedHref = isProtected && !token ? '/login' : href
                return (
                  <React.Fragment key={label}>
                    {i > 0 && <span className="text-gray-300 text-2xl select-none">|</span>}
                    <Link href={resolvedHref} className={`inline-flex items-center gap-1.5 border-b-2 px-1 pt-1 text-2xl font-semibold ${isActive ? activeClass : defaultClass}`}>
                      <Icon className="h-6 w-6" />
                      {label}
                    </Link>
                  </React.Fragment>
                )
              })}
            </div>
          </div>
          {/* Notebook breadcrumb */}
          {currentNotebook && (
            <div className="hidden lg:flex items-center gap-1.5 ml-4 text-slate-400">
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-600 truncate max-w-[200px]">
                {currentNotebook.course_code}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-500 truncate max-w-[240px]">
                {currentNotebook.title}
              </span>
            </div>
          )}

          {/* Search Bar */}
          <div className="flex flex-1 items-center justify-center px-2 lg:ml-6 lg:justify-end">
            <div className="grid w-full max-w-lg grid-cols-1 lg:max-w-xs">
              <input
                name="search"
                type="search"
                placeholder="Search"
                className="col-start-1 row-start-1 block w-full rounded-md bg-white/50 backdrop-blur-[30px] py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-emerald-600 sm:text-sm/6"
              />
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center text-gray-400"
              />
            </div>
          </div>
          <div className="flex items-center lg:hidden">
            {/* Mobile menu button */}
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-2 focus:-outline-offset-1 focus:outline-emerald-600">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open navigation menu</span>
              <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
              <XMarkIcon aria-hidden="true" className="hidden size-6 group-data-open:block" />
            </DisclosureButton>
          </div>
          <div className="hidden lg:ml-4 lg:flex lg:items-center lg:gap-3">
            <SettingsDropdown />

            {token ? (
              <div className="ml-1 flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-medium text-white outline -outline-offset-1 outline-black/10 overflow-hidden">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    : displayInitial
                  }
                </span>
                <span className="max-w-[10rem] truncate text-sm font-medium text-gray-800">
                  {username || 'Signed in'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white/50 hover:text-gray-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <DisclosurePanel className="lg:hidden">
        <div className="space-y-1 pt-2 pb-3">
          {navLinks.map(({ href, label, protected: isProtected }) => {
            const linkPath = href.split('?')[0]
            const isActive = href !== '#' && pathname === linkPath
            const activeClass = 'border-emerald-600 bg-emerald-50 text-emerald-700'
            const defaultClass = 'border-transparent text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800'
            const baseClass = `block border-l-4 py-2 pr-4 pl-3 text-base font-medium ${isActive ? activeClass : defaultClass}`
            const resolvedHref = isProtected && !token ? '/login' : href
            return (
              <DisclosureButton key={label} as={Link} href={resolvedHref} className={baseClass}>
                {label}
              </DisclosureButton>
            )
          })}
        </div>
        <div className="border-t border-gray-200 pt-4 pb-3">
          {token ? (
            <>
              <div className="flex items-center px-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-medium text-white outline -outline-offset-1 outline-black/10">
                  {displayInitial}
                </div>
                <div className="ml-3 min-w-0">
                  <div className="truncate text-base font-medium text-gray-800">
                    {username || 'Signed in'}
                  </div>
                  <div className="text-sm font-medium text-gray-500">NoteBud account</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 px-2">
                <DisclosureButton
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-md px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                >
                  Sign out
                </DisclosureButton>
              </div>
            </>
          ) : (
            <div className="space-y-2 px-4">
              <DisclosureButton
                as={Link}
                href="/login"
                className="block w-full rounded-md border border-gray-200 px-4 py-2 text-center text-base font-medium text-gray-800 hover:bg-gray-50"
              >
                Sign in
              </DisclosureButton>
              <DisclosureButton
                as={Link}
                href="/register"
                className="block w-full rounded-md bg-emerald-600 px-4 py-2 text-center text-base font-medium text-white hover:bg-emerald-700"
              >
                Register
              </DisclosureButton>
            </div>
          )}
        </div>
      </DisclosurePanel>
    </Disclosure>
  )
}
