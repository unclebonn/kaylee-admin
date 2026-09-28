'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, CalendarDays, Check, CheckCheck, ChevronDown, ChevronUp, Clock3, Phone, Search, Share2, StickyNote, Wallet } from 'lucide-react'
import AdminHeader from '@/components/AdminHeader'
import { formatPriceVnd } from '@/lib/booking'
import type { Booking } from '@/lib/types'

type Stats = { today: number; pending: number; confirmed: number; total: number }
type RevenueStats = {
  month: string
  totalRevenue: number
  totalBookings: number
  todayRevenue: number
  todayBookings: number
  monthRevenue: number
  upcomingCount: number
  perDay: { date: string; revenue: number; count: number }[]
  topServices: { name: string; count: number; revenue: number }[]
}

const STATUS_LABEL: Record<Booking['status'], string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
}

const STATUS_STYLE: Record<Booking['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-camel-200 text-camel-800',
  CANCELLED: 'bg-red-100 text-red-700',
}

const STATUS_OPTIONS: { value: '' | Booking['status']; label: string; dot: string }[] = [
  { value: '', label: 'Tất cả trạng thái', dot: 'bg-camel-300' },
  { value: 'PENDING', label: 'Chờ xác nhận', dot: 'bg-amber-400' },
  { value: 'CONFIRMED', label: 'Đã xác nhận', dot: 'bg-emerald-500' },
  { value: 'COMPLETED', label: 'Hoàn thành', dot: 'bg-camel-700' },
  { value: 'CANCELLED', label: 'Đã hủy', dot: 'bg-red-400' },
]

const CANCEL_REASONS = ['Khách yêu cầu hủy', 'Khách không đến', 'Đặt trùng lịch', 'Tiệm bận đột xuất']

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDate(value: string) {
  return value.split('-').reverse().join('/')
}

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')}₫`
}

// Nhãn trên cột biểu đồ hiển thị đầy đủ theo dạng tiền chuẩn (400.000)
function formatShort(value: number) {
  return value.toLocaleString('vi-VN')
}

function formatCreatedAt(value: string) {
  const date = new Date(value)
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function monthLabel(month: string) {
  const [year, m] = month.split('-').map(Number)
  return `Tháng ${m} Năm ${year}`
}

function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(year, m - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export default function AdminDashboard({ username }: { username: string }) {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<Stats>({ today: 0, pending: 0, confirmed: 0, total: 0 })
  const [revenue, setRevenue] = useState<RevenueStats | null>(null)
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState<'' | Booking['status']>('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({})
  const [busyId, setBusyId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (status) params.set('status', status)
    if (debouncedQuery) params.set('q', debouncedQuery)
    try {
      const [bookingsRes, statsRes] = await Promise.all([
        fetch(`/api/bookings?${params.toString()}`),
        fetch(`/api/stats?month=${month}`),
      ])
      if (bookingsRes.status === 401 || statsRes.status === 401) {
        router.replace('/login')
        return
      }
      const data = await bookingsRes.json().catch(() => null)
      const rev = await statsRes.json().catch(() => null)
      if (!bookingsRes.ok || !data) {
        setLoadError(data?.error || 'Không thể tải danh sách lịch.')
        setBookings([])
      } else {
        setBookings(data.bookings ?? [])
        setStats(data.stats ?? { today: 0, pending: 0, confirmed: 0, total: 0 })
        setLoadError('')
      }
      if (statsRes.ok && rev && !rev.error) setRevenue(rev)
    } catch {
      setLoadError('Không thể kết nối máy chủ.')
    }
    setLoading(false)
  }, [date, status, debouncedQuery, month, router])

  useEffect(() => {
    load()
  }, [load])

  const patch = async (id: number, body: Record<string, unknown>) => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Không thể cập nhật lịch.')
        return false
      }
      await load()
      return true
    } catch {
      alert('Không thể kết nối máy chủ.')
      return false
    } finally {
      setBusyId(null)
    }
  }

  const share = async (booking: Booking) => {
    setBusyId(booking.id)
    let url = ''
    try {
      const res = await fetch(`/api/bookings/${booking.id}/share`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || 'Không thể tạo link chia sẻ.')
        setBusyId(null)
        return
      }
      url = data.url
    } catch {
      alert('Không thể kết nối máy chủ.')
      setBusyId(null)
      return
    }
    setBusyId(null)

    let shared = false
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Hóa đơn — Kaylee Beauty Studio', text: `Hóa đơn dịch vụ của ${booking.customerName}`, url })
        shared = true
      }
    } catch {
      // khách/người dùng đóng khung chia sẻ hoặc không hỗ trợ — rơi xuống copy link
    }
    if (!shared) {
      try {
        await navigator.clipboard.writeText(url)
        setCopiedId(booking.id)
        setTimeout(() => setCopiedId((current) => (current === booking.id ? null : current)), 2500)
      } catch {
        alert(`Link hóa đơn: ${url}`)
      }
    }
  }

  const confirmCancel = async () => {
    if (!cancelTarget || cancelReason.trim().length === 0) return
    const ok = await patch(cancelTarget.id, { status: 'CANCELLED', cancelReason: cancelReason.trim() })
    if (ok) {
      setCancelTarget(null)
      setCancelReason('')
    }
  }

  const toggleExpand = (booking: Booking) => {
    setExpandedId((current) => {
      const next = current === booking.id ? null : booking.id
      if (next !== null) setNoteDrafts((drafts) => ({ ...drafts, [booking.id]: booking.note ?? '' }))
      return next
    })
  }

  const today = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })()
  const maxDayRevenue = Math.max(1, ...(revenue?.perDay ?? []).map((day) => day.revenue))
  const topMax = Math.max(1, ...(revenue?.topServices ?? []).map((service) => service.count))

  const overviewCards = [
    { label: 'Lịch hôm nay', value: String(stats.today) },
    { label: 'Chờ xác nhận', value: String(stats.pending) },
    { label: 'Đã xác nhận', value: String(stats.confirmed) },
    { label: 'Lịch chưa tới', value: String(revenue?.upcomingCount ?? 0) },
    { label: 'Doanh thu hôm nay', value: formatMoney(revenue?.todayRevenue ?? 0) },
    { label: 'Doanh thu tổng', value: formatMoney(revenue?.totalRevenue ?? 0) },
  ]

  const currentStatus = STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0]

  return (
    <div className="min-h-screen bg-camel-50 text-camel-900">
      <AdminHeader onCreated={load} />

      <main className="mx-auto max-w-7xl px-5 pb-20 pt-8 lg:px-10">
        <p className="hidden text-xs text-camel-500 md:block">Xin chào, {username}</p>

        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {overviewCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-camel-200 bg-camel-100/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-camel-600">{card.label}</p>
              <p className="mt-2 font-serif text-2xl text-camel-900">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.65fr_1fr]">
          <section className="rounded-2xl border border-camel-200 bg-camel-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="inline-flex items-center gap-2 font-serif text-xl text-camel-900">
                  <Wallet size={17} className="text-camel-600" /> Doanh thu theo ngày
                </h2>
                <p className="mt-1 text-xs text-camel-600">Tổng tiền lịch đã hoàn thành trong tháng · {formatMoney(revenue?.monthRevenue ?? 0)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-camel-700 transition hover:bg-camel-100" aria-label="Tháng trước">‹</button>
                <span className="min-w-32 text-center text-xs font-bold uppercase tracking-wide text-camel-700">{monthLabel(month)}</span>
                <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-camel-700 transition hover:bg-camel-100" aria-label="Tháng sau">›</button>
              </div>
            </div>
            <div className="mt-5 flex h-44 items-end gap-[3px]">
              {(revenue?.perDay ?? []).map((day) => {
                const height = day.revenue > 0 ? Math.max(6, Math.round((day.revenue / maxDayRevenue) * 100)) : 3
                const isToday = day.date === today
                return (
                  <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${formatDate(day.date)}: ${formatMoney(day.revenue)} (${day.count} lịch)`}>
                    {day.revenue > 0 && <span className="text-[9px] font-semibold text-camel-700">{formatShort(day.revenue)}</span>}
                    <div
                      className={`w-full rounded-t-md transition-all ${isToday ? 'bg-camel-500' : day.revenue > 0 ? 'bg-camel-800' : 'bg-camel-200'}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="mt-1.5 flex gap-[3px]">
              {(revenue?.perDay ?? []).map((day) => (
                <span key={day.date} className={`min-w-0 flex-1 text-center text-[8px] ${day.date === today ? 'font-bold text-camel-800' : 'text-camel-500'}`}>
                  {Number(day.date.slice(-2))}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-camel-200 bg-camel-50 p-5">
            <h2 className="font-serif text-xl text-camel-900">Dịch vụ được dùng nhiều nhất</h2>
            <p className="mt-1 text-xs text-camel-600">Toàn bộ lịch chưa hủy</p>
            <div className="mt-5 space-y-3.5">
              {(revenue?.topServices ?? []).length === 0 && <p className="text-sm text-camel-500">Chưa có dữ liệu.</p>}
              {(revenue?.topServices ?? []).map((service, index) => (
                <div key={service.name}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-camel-800">
                      <span className="mr-1.5 font-serif font-bold text-camel-500">{index + 1}.</span>
                      {service.name}
                    </span>
                    <span className="shrink-0 font-semibold text-camel-700">{service.count} lần</span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-camel-100">
                    <div className="h-full rounded-full bg-camel-700" style={{ width: `${Math.max(6, Math.round((service.count / topMax) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-camel-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên hoặc SĐT..."
              className="w-full rounded-xl border border-camel-200 bg-camel-50 py-3 pl-11 pr-4 text-sm outline-none ring-camel-400 focus:ring-2"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setStatusOpen((v) => !v)}
              className="inline-flex items-center gap-2.5 rounded-xl border border-camel-200 bg-camel-50 px-4 py-3 text-sm text-camel-800 outline-none transition hover:bg-camel-100"
            >
              <span className={`h-2 w-2 rounded-full ${currentStatus.dot}`} />
              {currentStatus.label}
              <ChevronDown size={14} className={`text-camel-500 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
            </button>
            {statusOpen && (
              <>
                <div className="fixed inset-0 z-10 cursor-default" onClick={() => setStatusOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-camel-200 bg-camel-50 py-1 shadow-lg shadow-camel-900/10">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        setStatus(option.value)
                        setStatusOpen(false)
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-camel-800 transition hover:bg-camel-100"
                    >
                      <span className={`h-2 w-2 rounded-full ${option.dot}`} />
                      <span className={option.value === status ? 'font-semibold' : ''}>{option.label}</span>
                      {option.value === status && <Check size={14} className="ml-auto text-camel-700" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-xl border border-camel-200 bg-camel-50 px-4 py-3 text-sm outline-none ring-camel-400 focus:ring-2"
            />
            {date && (
              <button
                onClick={() => setDate('')}
                className="rounded-xl border border-camel-200 bg-camel-100 px-3 py-3 text-xs font-semibold text-camel-700 transition hover:bg-camel-200"
              >
                Xóa lọc ngày
              </button>
            )}
          </div>
        </div>

        {loadError && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{loadError}</p>}

        <div className="mt-6 space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-camel-200 bg-camel-100/50" />)
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-camel-300 bg-camel-100/30 p-14 text-center">
              <p className="font-serif text-2xl text-camel-800">Chưa có lịch đặt nào</p>
              <p className="mt-2 text-sm text-camel-600">Lịch khách đặt từ website hoặc lịch bạn thêm tại đây sẽ hiện ở danh sách này.</p>
            </div>
          ) : (
            bookings.map((booking) => {
              const expanded = expandedId === booking.id
              const busy = busyId === booking.id
              const services = (booking.services ?? []) as { vi: string; en: string; price: string; category: string }[]
              return (
                <article key={booking.id} className="rounded-2xl border border-camel-200 bg-camel-50 p-4 transition hover:shadow-sm sm:p-5">
                  <div className="grid gap-4 md:grid-cols-[1.25fr_1.6fr_0.9fr_auto] md:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-lg text-camel-900">{booking.customerName}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${booking.source === 'WALKIN' ? 'bg-camel-800 text-camel-50' : 'border border-camel-300 bg-camel-100 text-camel-700'}`}>
                          {booking.source === 'WALKIN' ? 'Tại quầy' : 'Online'}
                        </span>
                      </div>
                      {booking.phone ? (
                        <a href={`tel:${booking.phone}`} className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-camel-700 transition hover:text-camel-500">
                          <Phone size={13} /> {booking.phone}
                        </a>
                      ) : (
                        <p className="mt-1.5 text-sm text-camel-400">Không có SĐT</p>
                      )}
                      <p className="mt-1.5 text-xs text-camel-500">Tạo lúc {formatCreatedAt(booking.createdAt)}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-camel-900">
                        {services[0]?.vi ?? '—'}
                        {services.length > 1 && <span className="font-normal text-camel-600"> +{services.length - 1} dịch vụ khác</span>}
                      </p>
                      <p className="mt-1 text-sm text-camel-700">
                        <span className="font-semibold">{formatMoney(booking.totalPrice)}</span>
                        <span className="text-xs text-camel-500"> (tạm tính)</span>
                      </p>
                    </div>

                    <div>
                      <p className="inline-flex items-center gap-1.5 text-sm text-camel-800">
                        <CalendarDays size={14} className="text-camel-500" /> {formatDate(booking.bookingDate)}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-camel-800">
                        <Clock3 size={14} className="text-camel-500" /> {booking.bookingTime}
                      </p>
                      <p className="mt-2">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLE[booking.status]}`}>
                          {STATUS_LABEL[booking.status]}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {booking.status === 'PENDING' && (
                        <button
                          onClick={() => patch(booking.id, { status: 'CONFIRMED' })}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-full bg-camel-800 px-3.5 py-2 text-[13px] font-medium text-camel-50 transition hover:bg-camel-700 disabled:opacity-50"
                        >
                          <Check size={13} /> Xác nhận
                        </button>
                      )}
                      {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                        <>
                          <button
                            onClick={() => patch(booking.id, { status: 'COMPLETED' })}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-full border border-camel-300 bg-camel-100 px-3.5 py-2 text-[13px] font-medium text-camel-800 transition hover:bg-camel-200 disabled:opacity-50"
                          >
                            <CheckCheck size={13} /> Hoàn thành
                          </button>
                          <button
                            onClick={() => {
                              setCancelTarget(booking)
                              setCancelReason('')
                            }}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-[13px] font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            <Ban size={13} /> Hủy
                          </button>
                        </>
                      )}
                      {booking.status === 'COMPLETED' && (
                        <button
                          onClick={() => share(booking)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-full border border-camel-300 bg-camel-100 px-3.5 py-2 text-[13px] font-medium text-camel-800 transition hover:bg-camel-200 disabled:opacity-50"
                        >
                          <Share2 size={13} /> {copiedId === booking.id ? 'Đã copy ✓' : 'Chia sẻ'}
                        </button>
                      )}
                      <button
                        onClick={() => toggleExpand(booking)}
                        title="Ghi chú & chi tiết"
                        className="inline-flex items-center gap-1 rounded-full border border-camel-200 bg-camel-100 px-3 py-2 text-[13px] font-medium text-camel-700 transition hover:bg-camel-200"
                      >
                        <StickyNote size={13} /> {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 border-t border-camel-200 pt-4">
                      <div className="grid gap-5 md:grid-cols-2">
                        {booking.status === 'CANCELLED' && booking.cancelReason && (
                          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">
                            <span className="font-bold">Lý do hủy:</span> {booking.cancelReason}
                          </p>
                        )}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-camel-600">Dịch vụ đã chọn</p>
                          <div className="mt-2 space-y-1.5">
                            {services.map((service, index) => (
                              <div key={index} className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-camel-800">{service.vi}</span>
                                <span className="font-medium text-camel-700">{formatPriceVnd(service.price)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-camel-600">Ghi chú nội bộ</p>
                          <textarea
                            value={noteDrafts[booking.id] ?? ''}
                            onChange={(event) => setNoteDrafts((drafts) => ({ ...drafts, [booking.id]: event.target.value }))}
                            rows={3}
                            placeholder="VD: Khách muốn thử mẫu mới, đến sớm 10 phút..."
                            className="mt-2 w-full rounded-xl border border-camel-200 bg-camel-100/60 px-4 py-3 text-sm outline-none ring-camel-400 focus:ring-2"
                          />
                          <button
                            onClick={() => patch(booking.id, { note: noteDrafts[booking.id] ?? '' })}
                            disabled={busy}
                            className="mt-2 rounded-full bg-camel-800 px-4 py-2 text-[13px] font-medium text-camel-50 transition hover:bg-camel-700 disabled:opacity-50"
                          >
                            Lưu ghi chú
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              )
            })
          )}
        </div>
      </main>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-camel-900/40 p-4 backdrop-blur-sm" onClick={() => setCancelTarget(null)}>
          <div className="w-full max-w-md rounded-[2rem] bg-camel-50 p-7 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="font-serif text-2xl text-camel-900">Hủy lịch của {cancelTarget.customerName}?</h2>
            <p className="mt-1 text-sm text-camel-600">
              {formatDate(cancelTarget.bookingDate)} · {cancelTarget.bookingTime} · {formatMoney(cancelTarget.totalPrice)}
            </p>
            <p className="mt-5 text-sm font-semibold text-camel-900">Lý do hủy *</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {CANCEL_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setCancelReason(reason)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    cancelReason === reason ? 'bg-camel-800 text-camel-50' : 'border border-camel-200 bg-camel-100 text-camel-700 hover:bg-camel-200'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={3}
              placeholder="Nhập lý do hủy lịch..."
              className="mt-3 w-full rounded-xl border border-camel-200 bg-camel-100/60 px-4 py-3 text-sm outline-none ring-camel-400 focus:ring-2"
            />
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                className="rounded-full border border-camel-300 bg-camel-100 px-5 py-2.5 text-sm font-medium text-camel-800 transition hover:bg-camel-200"
              >
                Đóng
              </button>
              <button
                onClick={confirmCancel}
                disabled={busyId === cancelTarget.id || cancelReason.trim().length === 0}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {busyId === cancelTarget.id ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
