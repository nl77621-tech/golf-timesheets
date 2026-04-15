'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/timesheets', label: 'Timesheets' },
  { href: '/employees', label: 'Employees' },
  { href: '/stat-holidays', label: 'Stat Holidays' },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-green-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#9971;</span>
            <span className="font-bold text-lg hidden sm:inline">Golf Timesheets</span>
          </div>

          <div className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
                    ? 'bg-green-900 text-white'
                    : 'text-green-100 hover:bg-green-700'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="text-green-200 hover:text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
