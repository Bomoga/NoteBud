import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { Bars3Icon, BellIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function NavBar() {
  return (
    <Disclosure
      as="nav"
      className="relative z-20 bg-[linear-gradient(135deg,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0.15)_100%)] backdrop-blur-[30px] backdrop-saturate-[130%] border-t border-t-white/50 border-x border-l-white/40 border-r-white/15 border-b border-b-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_0_20px_rgba(255,255,255,0.1)]"
    >
      <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex px-2 lg:px-0">
            <div className="flex shrink-0 items-center">
              <img
                alt="NoteBud Logo"
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=emerald&shade=600"
                className="h-8 w-auto dark:hidden"
              />
              <img
                alt="NoteBud Logo"
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=emerald&shade=500"
                className="h-8 w-auto not-dark:hidden"
              />
            </div>
            <div className="hidden lg:ml-6 lg:flex lg:space-x-8">
              {/* Current: "border-emerald-600 text-gray-900 dark:border-emerald-500 dark:text-white", Default: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-white" */}
              <a
                href="#"
                className="inline-flex items-center border-b-2 border-emerald-600 px-1 pt-1 text-sm font-medium text-gray-900 dark:border-emerald-500 dark:text-white"
              >
                Home
              </a>
              <a
                href="#"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-white"
              >
                Courses
              </a>
              <a
                href="#"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-white"
              >
                Notes
              </a>
              <a
                href="#"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-white"
              >
                Chat
              </a>
            </div>
          </div>
          {/* Search Bar */}
          <div className="flex flex-1 items-center justify-center px-2 lg:ml-6 lg:justify-end">
            <div className="grid w-full max-w-lg grid-cols-1 lg:max-w-xs">
              <input
                name="search"
                type="search"
                placeholder="Search"
                className="col-start-1 row-start-1 block w-full rounded-md bg-white/50 backdrop-blur-[30px] py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-emerald-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-emerald-500"
              />
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center text-gray-400"
              />
            </div>
          </div>
          <div className="flex items-center lg:hidden">
            {/* Mobile menu button */}
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-2 focus:-outline-offset-1 focus:outline-emerald-600 dark:hover:bg-white/5 dark:hover:text-white dark:focus:outline-emerald-500">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open navigation menu</span>
              <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
              <XMarkIcon aria-hidden="true" className="hidden size-6 group-data-open:block" />
            </DisclosureButton>
          </div>
          <div className="hidden lg:ml-4 lg:flex lg:items-center">
            <button
              type="button"
              className="relative shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:hover:text-white dark:focus:outline-emerald-500"
            >
              <span className="absolute -inset-1.5" />
              <span className="sr-only">View chat</span>
              <BellIcon aria-hidden="true" className="size-6" />
            </button>

            {/* Profile dropdown */}
            <Menu as="div" className="relative ml-4 shrink-0">
              <MenuButton className="relative flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:focus-visible:outline-emerald-500">
                <span className="absolute -inset-1.5" />
                <span className="sr-only">Open profile menu</span>
                <img
                  alt=""
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  className="size-8 rounded-full bg-gray-100 outline -outline-offset-1 outline-black/5 dark:bg-gray-800 dark:outline-white/10"
                />
              </MenuButton>

              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg outline-1 outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10"
              >
                <MenuItem>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden dark:text-gray-300 dark:data-focus:bg-white/5"
                  >
                    Profile
                  </a>
                </MenuItem>
                <MenuItem>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden dark:text-gray-300 dark:data-focus:bg-white/5"
                  >
                    Preferences
                  </a>
                </MenuItem>
                <MenuItem>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden dark:text-gray-300 dark:data-focus:bg-white/5"
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
          {/* Current: "bg-emerald-50 border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-600/10 dark:text-emerald-400", Default: "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 dark:text-gray-300 dark:hover:border-white/20 dark:hover:bg-white/5 dark:hover:text-white" */}
          <DisclosureButton
            as="a"
            href="#"
            className="block border-l-4 border-emerald-600 bg-emerald-50 py-2 pr-4 pl-3 text-base font-medium text-emerald-700 dark:border-emerald-500 dark:bg-emerald-600/10 dark:text-emerald-400"
          >
            Home
          </DisclosureButton>
          <DisclosureButton
            as="a"
            href="#"
            className="block border-l-4 border-transparent py-2 pr-4 pl-3 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-300 dark:hover:border-white/20 dark:hover:bg-white/5 dark:hover:text-white"
          >
            Courses
          </DisclosureButton>
          <DisclosureButton
            as="a"
            href="#"
            className="block border-l-4 border-transparent py-2 pr-4 pl-3 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-300 dark:hover:border-white/20 dark:hover:bg-white/5 dark:hover:text-white"
          >
            Notes
          </DisclosureButton>
          <DisclosureButton
            as="a"
            href="#"
            className="block border-l-4 border-transparent py-2 pr-4 pl-3 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-300 dark:hover:border-white/20 dark:hover:bg-white/5 dark:hover:text-white"
          >
            Chat
          </DisclosureButton>
        </div>
        <div className="border-t border-gray-200 pt-4 pb-3 dark:border-white/10">
          <div className="flex items-center px-4">
            <div className="shrink-0">
              <img
                alt=""
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                className="size-10 rounded-full bg-gray-100 outline -outline-offset-1 outline-black/5 dark:bg-gray-800 dark:outline-white/10"
              />
            </div>
            <div className="ml-3">
              <div className="text-base font-medium text-gray-800 dark:text-gray-200">John Doe</div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">tom@example.com</div>
            </div>
            <button
              type="button"
              className="relative ml-auto shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 dark:hover:text-white dark:focus:outline-emerald-500"
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
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Your profile
            </DisclosureButton>
            <DisclosureButton
              as="a"
              href="#"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Settings
            </DisclosureButton>
            <DisclosureButton
              as="a"
              href="#"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Sign out
            </DisclosureButton>
          </div>
        </div>
      </DisclosurePanel>
    </Disclosure>
  )
}
