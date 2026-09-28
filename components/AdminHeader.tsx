'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Plus } from 'lucide-react'
import AddBookingModal from '@/components/AddBookingModal'

const NAV_LINKS = [
  { href: '/', label: 'Tổng quan' },
  { href: '/services', label: 'Dịch vụ' },
]

export default function AdminHeader({ onCreated }: { onCreated?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' })
    } catch {}
    router.replace('/login')
    router.refresh()
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-camel-200/70 bg-camel-50/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-5 lg:px-10">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/" aria-label="Về tổng quan">
            <img src="/images/logo/kaylee-logo-nau.png" alt="Kaylee Beauty Studio" className="h-10 w-auto" />
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  pathname === link.href ? 'bg-camel-800 text-camel-50 shadow-sm' : 'text-camel-700 hover:bg-camel-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-full bg-camel-800 px-5 py-2.5 text-sm font-medium text-camel-50 transition hover:bg-camel-700"
          >
            <Plus size={15} /> Thêm lịch
          </button>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-camel-300 bg-camel-100 px-4 py-2.5 text-sm font-medium text-camel-800 transition hover:bg-camel-200"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 px-5 pb-2 md:hidden">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              pathname === link.href ? 'bg-camel-800 text-camel-50' : 'border border-camel-200 bg-camel-100 text-camel-700'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      </header>
      {/* Modal phải nằm ngoài <header>: backdrop-blur của header tạo containing block làm vỡ position:fixed */}
      {showAdd && (
        <AddBookingModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false)
            onCreated?.()
          }}
        />
      )}
    </>
  )
}
