'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Lock, User } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Không thể đăng nhập. Vui lòng thử lại.')
        setBusy(false)
        return
      }
      router.replace('/')
      router.refresh()
    } catch {
      setError('Không thể kết nối máy chủ. Vui lòng thử lại.')
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-camel-50 px-5 py-12">
      <div className="w-full max-w-md rounded-[2rem] border border-camel-200 bg-camel-50 p-8 shadow-[0_18px_50px_rgba(74,52,28,0.12)] sm:p-10">
        <div className="text-center">
          <img src="/images/logo/kaylee-logo-nau.png" alt="Kaylee Beauty Studio" className="mx-auto h-14 w-auto" />
          <h1 className="mt-6 font-serif text-3xl text-camel-900">Quản lý đặt lịch</h1>
          <p className="mt-2 text-sm text-camel-700/80">Kaylee Beauty Studio — trang dành cho chủ tiệm</p>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm font-semibold text-camel-900">
            Tài khoản
            <div className="relative mt-2">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-camel-400" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="admin"
                className="w-full rounded-xl border border-camel-200 bg-camel-100/60 py-3 pl-11 pr-4 font-normal outline-none ring-camel-400 focus:ring-2"
              />
            </div>
          </label>
          <label className="block text-sm font-semibold text-camel-900">
            Mật khẩu
            <div className="relative mt-2">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-camel-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-camel-200 bg-camel-100/60 py-3 pl-11 pr-4 font-normal outline-none ring-camel-400 focus:ring-2"
              />
            </div>
          </label>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-camel-800 py-3.5 text-sm font-semibold text-camel-50 transition hover:bg-camel-700 disabled:opacity-60"
          >
            <LogIn size={16} />
            {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </main>
  )
}
