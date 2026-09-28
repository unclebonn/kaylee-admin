'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clock3, Search, X } from 'lucide-react'
import { formatPriceVnd, nowTimeString, parsePriceVnd, todayDateString } from '@/lib/booking'

type CatalogService = { id: number; name: string; nameEn: string; price: string; image: string | null }
type CatalogCategory = { id: number; name: string; services: CatalogService[] }

// Mục dịch vụ dạng phẳng khớp với snapshot JSON lưu trong booking
type FlatService = { vi: string; en: string; price: string; category: string }

export default function AddBookingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const today = todayDateString()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(today)
  const [time, setTime] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [note, setNote] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [booked, setBooked] = useState<string[]>([])
  const [catalog, setCatalog] = useState<CatalogCategory[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/catalog')
      .then((res) => (res.ok ? res.json() : { categories: [] }))
      .then((data) => {
        if (!alive) return
        const cats = (data?.categories ?? []) as CatalogCategory[]
        setCatalog(cats)
        setCategory(cats[0]?.name ?? '')
        setCatalogLoading(false)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const flat: FlatService[] = useMemo(
    () =>
      catalog.flatMap((cat) =>
        cat.services.map((service) => ({ vi: service.name, en: service.nameEn || service.name, price: service.price, category: cat.name })),
      ),
    [catalog],
  )

  useEffect(() => {
    let alive = true
    fetch(`/api/bookings?date=${date}`)
      .then((res) => (res.ok ? res.json() : { bookings: [] }))
      .then((data) => {
        if (!alive) return
        const times = ((data?.bookings ?? []) as { status: string; bookingTime: string }[])
          .filter((booking) => booking.status !== 'CANCELLED')
          .map((booking) => booking.bookingTime)
        setBooked(times)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [date])

  const isFree = (slot: string) => !booked.includes(slot) && !(date === today && slot <= nowTimeString())

  useEffect(() => {
    if (time && !isFree(time)) setTime('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, booked])

  const visibleServices = useMemo(
    () =>
      catalog
        .filter((cat) => cat.name === category)
        .flatMap((cat) => cat.services.map((service) => ({ service, flatIndex: flat.findIndex((f) => f.vi === service.name && f.category === cat.name) })))
        .filter(({ service }) => `${service.name} ${service.nameEn}`.toLowerCase().includes(search.toLowerCase())),
    [catalog, category, flat, search],
  )

  const total = selected.reduce((sum, index) => sum + parsePriceVnd(flat[index]?.price ?? ''), 0)

  const toggleService = (index: number) => {
    setSelected((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]))
  }

  const submit = async () => {
    if (busy) return
    if (name.trim().length < 2) {
      setError('Vui lòng nhập tên khách.')
      return
    }
    if (!time) {
      setError('Vui lòng chọn khung giờ.')
      return
    }
    if (selected.length === 0) {
      setError('Vui lòng chọn ít nhất một dịch vụ.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone,
          date,
          time,
          services: selected.map((index) => flat[index]),
          note,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Không thể tạo lịch. Vui lòng thử lại.')
        setBusy(false)
        return
      }
      onCreated()
    } catch {
      setError('Không thể kết nối máy chủ. Vui lòng thử lại.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-camel-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-3xl flex-col rounded-[2rem] bg-camel-50 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-camel-200 px-7 py-5">
          <div>
            <h2 className="font-serif text-2xl text-camel-900">Thêm lịch tại quầy</h2>
            <p className="mt-0.5 text-xs text-camel-600">Dành cho khách đến trực tiếp — lịch sẽ ở trạng thái “Đã xác nhận”.</p>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="rounded-full border border-camel-200 bg-camel-100 p-2.5 text-camel-700 transition hover:bg-camel-200">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-7 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-camel-900">
              Tên khách *
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="VD: Nguyễn Thị A"
                className="mt-2 w-full rounded-xl border border-camel-200 bg-camel-100/60 px-4 py-3 font-normal outline-none ring-camel-400 focus:ring-2"
              />
            </label>
            <label className="block text-sm font-semibold text-camel-900">
              Số điện thoại (không bắt buộc)
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="VD: 0912345678"
                inputMode="tel"
                className="mt-2 w-full rounded-xl border border-camel-200 bg-camel-100/60 px-4 py-3 font-normal outline-none ring-camel-400 focus:ring-2"
              />
            </label>
          </div>

          <div>
            <p className="text-sm font-semibold text-camel-900">Ngày *</p>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(event) => setDate(event.target.value || today)}
              className="mt-2 rounded-xl border border-camel-200 bg-camel-100/60 px-4 py-3 text-sm outline-none ring-camel-400 focus:ring-2"
            />
          </div>

          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-camel-900">
              <Clock3 size={15} className="text-camel-500" /> Giờ *
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {(['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'] as const).map((slot) => {
                const free = isFree(slot)
                const active = time === slot
                return (
                  <button
                    type="button"
                    key={slot}
                    disabled={!free}
                    onClick={() => setTime(slot)}
                    className={`rounded-xl border px-2 py-3 text-sm font-medium transition ${
                      active
                        ? 'border-camel-700 bg-camel-800 text-camel-50 shadow-sm'
                        : free
                          ? 'border-camel-200 text-camel-700 hover:border-camel-500 hover:bg-camel-100'
                          : 'cursor-not-allowed border-camel-100 bg-camel-100 text-camel-300 line-through'
                    }`}
                  >
                    {slot}
                    {!free && <span className="ml-1 text-[10px]">Đã đặt</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-camel-900">Dịch vụ *</p>
              <span className="text-xs font-semibold text-camel-600">{selected.length} đã chọn</span>
            </div>
            {catalogLoading ? (
              <p className="mt-3 text-sm text-camel-500">Đang tải dịch vụ...</p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {catalog.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setCategory(cat.name)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                        cat.name === category ? 'bg-camel-800 text-camel-50 shadow-sm' : 'border border-camel-200 bg-camel-50 text-camel-700 hover:border-camel-500 hover:bg-camel-100'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                <div className="relative mt-3">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-camel-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm dịch vụ trong nhóm..."
                    className="w-full rounded-xl border border-camel-200 bg-camel-50 py-2.5 pl-10 pr-4 text-sm outline-none ring-camel-400 focus:ring-2"
                  />
                </div>
                <div className="mt-3 grid h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {visibleServices.map(({ service, flatIndex }) => {
                    const active = selected.includes(flatIndex)
                    return (
                      <button
                        type="button"
                        key={service.id}
                        onClick={() => toggleService(flatIndex)}
                        className={`flex min-h-[56px] items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                          active ? 'border-camel-700 bg-camel-800 shadow-sm' : 'border-camel-200 bg-camel-50 hover:border-camel-500 hover:bg-camel-100'
                        }`}
                      >
                        <span className={`text-[13px] leading-snug ${active ? 'text-camel-50' : 'text-camel-900'}`}>{service.name}</span>
                        <span className={`flex shrink-0 items-center gap-1.5 text-[13px] font-semibold ${active ? 'text-camel-200' : 'text-camel-700'}`}>
                          {formatPriceVnd(service.price)}
                          {active && <Check size={13} strokeWidth={2.5} />}
                        </span>
                      </button>
                    )
                  })}
                  {visibleServices.length === 0 && <p className="col-span-full py-4 text-center text-sm text-camel-500">Không tìm thấy dịch vụ nào.</p>}
                </div>
                {selected.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-camel-200 pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {selected.map((index) => (
                        <button
                          type="button"
                          key={index}
                          onClick={() => toggleService(index)}
                          className="flex items-center gap-1.5 rounded-full bg-camel-800 py-1 pl-2.5 pr-2 text-[11px] font-semibold text-camel-50 transition hover:bg-camel-700"
                        >
                          <span className="max-w-[180px] truncate">{flat[index]?.vi}</span>
                          <X size={11} className="text-camel-300" />
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-camel-800">
                      Tạm tính: <span className="font-serif text-lg font-semibold">{total.toLocaleString('vi-VN')}₫</span>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <label className="block text-sm font-semibold text-camel-900">
            Ghi chú
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="VD: Khách muốn thử mẫu mới..."
              className="mt-2 w-full rounded-xl border border-camel-200 bg-camel-100/60 px-4 py-3 text-sm font-normal outline-none ring-camel-400 focus:ring-2"
            />
          </label>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-camel-200 px-7 py-4">
          <button onClick={onClose} className="rounded-full border border-camel-300 bg-camel-100 px-6 py-3 text-sm font-medium text-camel-800 transition hover:bg-camel-200">
            Đóng
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-full bg-camel-800 px-7 py-3 text-sm font-semibold text-camel-50 transition hover:bg-camel-700 disabled:opacity-60"
          >
            {busy ? 'Đang tạo...' : 'Tạo lịch'}
          </button>
        </div>
      </div>
    </div>
  )
}
