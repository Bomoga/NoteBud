"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { Bars3Icon, BellIcon, XMarkIcon } from '@heroicons/react/24/outline'

const navLinks = [
  { href: '/', label: 'Home' },
  // TODO: Remove mock=1 after backend is implemented
  { href: '/backpack?mock=1', label: 'Backpack' },
  { href: '/notes?mock=1', label: 'Notes' },
  { href: '#', label: 'Chat' },
];

export default function NavBar() {
  const pathname = usePathname();

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
            <div className="hidden lg:ml-6 lg:flex lg:space-x-8">
              {navLinks.map(({ href, label }) => {
                const linkPath = href.split('?')[0]
                const isActive = href !== '#' && pathname === linkPath
                const baseClass = 'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                const activeClass = 'border-emerald-600 text-gray-900'
                const defaultClass = 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                return href === '#' ? (
                  <a
                    key={label}
                    href="#"
                    className={`${baseClass} ${defaultClass}`}
                  >
                    {label}
                  </a>
                ) : (
                  <Link
                    key={label}
                    href={href}
                    className={`${baseClass} ${isActive ? activeClass : defaultClass}`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
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
          <div className="hidden lg:ml-4 lg:flex lg:items-center">
            <button
              type="button"
              className="relative shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
            >
              <span className="absolute -inset-1.5" />
              <span className="sr-only">View chat</span>
              <BellIcon aria-hidden="true" className="size-6" />
            </button>

            {/* Profile dropdown */}
            <Menu as="div" className="relative ml-4 shrink-0">
              <MenuButton className="relative flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
                <span className="absolute -inset-1.5" />
                <span className="sr-only">Open profile menu</span>
                <img
                  alt=""
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  className="size-8 rounded-full bg-gray-100 outline -outline-offset-1 outline-black/5"
                />
              </MenuButton>

              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg outline-1 outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                <MenuItem>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                  >
                    Profile
                  </a>
                </MenuItem>
                <MenuItem>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                  >
                    Preferences
                  </a>
                </MenuItem>
                <MenuItem>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                  >
                    Logout
                  </a>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </div>

      <DisclosurePanel className="lg:hidden">
        <div className="space-y-1 pt-2 pb-3">
          {navLinks.map(({ href, label }) => {
            const linkPath = href.split('?')[0]
            const isActive = href !== '#' && pathname === linkPath
            const activeClass = 'border-emerald-600 bg-emerald-50 text-emerald-700'
            const defaultClass = 'border-transparent text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800'
            const baseClass = `block border-l-4 py-2 pr-4 pl-3 text-base font-medium ${isActive ? activeClass : defaultClass}`
            return href === '#' ? (
              <DisclosureButton key={label} as="a" href="#" className={baseClass}>
                {label}
              </DisclosureButton>
            ) : (
              <DisclosureButton key={label} as={Link} href={href} className={baseClass}>
                {label}
              </DisclosureButton>
            )
          })}
        </div>
        <div className="border-t border-gray-200 pt-4 pb-3">
          <div className="flex items-center px-4">
            <div className="shrink-0">
              <img
                alt=""
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                className="size-10 rounded-full bg-gray-100 outline -outline-offset-1 outline-black/5"
              />
            </div>
            <div className="ml-3">
              <div className="text-base font-medium text-gray-800">John Doe</div>
              <div className="text-sm font-medium text-gray-500">tom@example.com</div>
            </div>
            <button
              type="button"
              className="relative ml-auto shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
            >
              <span className="absolute -inset-1.5" />
              <span className="sr-only">View chat</span>
              <BellIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="mt-3 space-y-1">
            <DisclosureButton
              as="a"
              href="#"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              Your profile
            </DisclosureButton>
            <DisclosureButton
              as="a"
              href="#"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              Settings
            </DisclosureButton>
            <DisclosureButton
              as="a"
              href="#"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              Sign out
            </DisclosureButton>
          </div>
        </div>
      </DisclosurePanel>
    </Disclosure>
  )
}
