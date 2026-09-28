'use client'

import { useCallback, useEffect, useState } from 'react'
import { FolderPlus, Image as ImageIcon, Pencil, Trash2, X } from 'lucide-react'
import AdminHeader from '@/components/AdminHeader'
import { formatPriceVnd, parsePriceVnd } from '@/lib/booking'

type CatalogService = { id: number; name: string; nameEn: string; price: string; image: string | null; sortOrder: number }
type CatalogCategory = { id: number; name: string; nameEn: string | null; sortOrder: number; services: CatalogService[] }

const inputClass = 'w-full rounded-lg border border-camel-200 bg-camel-50 px-3 py-2 text-sm outline-none ring-camel-400 focus:ring-2'

// Định dạng sẵn khi gõ: "400000" → "400.000"; giữ nguyên phần đuôi như "/bộ" hay " – 250.000"
function formatPriceTyping(raw: string) {
  return raw.replace(/\d[\d.,]*/g, (chunk) => Number(chunk.replace(/[^\d]/g, '')).toLocaleString('vi-VN'))
}

export default function ServicesManager() {
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryNameEn, setNewCategoryNameEn] = useState('')
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameDraft, setRenameDraft] = useState({ name: '', nameEn: '' })
  const [drafts, setDrafts] = useState<Record<number, { name: string; nameEn: string; price: string; image: string }>>({})
  const [newService, setNewService] = useState<Record<number, { name: string; nameEn: string; price: string; image: string }>>({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/catalog')
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) {
        setError(data?.error || 'Không thể tải danh mục dịch vụ.')
        setCategories([])
      } else {
        setCategories(data.categories ?? [])
        setError('')
      }
    } catch {
      setError('Không thể kết nối máy chủ.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const call = async (url: string, method: string, body?: unknown) => {
    setBusy(true)
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || 'Thao tác thất bại.')
        return false
      }
      await load()
      return true
    } catch {
      alert('Không thể kết nối máy chủ.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Vui lòng nhập tên mục.')
      return
    }
    const ok = await call('/api/catalog/categories', 'POST', { name: newCategoryName, nameEn: newCategoryNameEn })
    if (ok) {
      setNewCategoryName('')
      setNewCategoryNameEn('')
      setShowAddCategory(false)
    }
  }

  const saveRename = async (category: CatalogCategory) => {
    const ok = await call(`/api/catalog/categories/${category.id}`, 'PATCH', { name: renameDraft.name, nameEn: renameDraft.nameEn })
    if (ok) setRenamingId(null)
  }

  const deleteCategory = async (category: CatalogCategory) => {
    if (!confirm(`Xóa mục "${category.name}"?`)) return
    await call(`/api/catalog/categories/${category.id}`, 'DELETE')
  }

  const addService = async (categoryId: number) => {
    const draft = newService[categoryId]
    if (!draft?.name.trim() || !draft.price.trim()) {
      alert('Vui lòng nhập tên và giá dịch vụ.')
      return
    }
    const ok = await call('/api/catalog/services', 'POST', { categoryId, name: draft.name, nameEn: draft.nameEn, price: draft.price, image: draft.image })
    if (ok) setNewService((current) => ({ ...current, [categoryId]: { name: '', nameEn: '', price: '', image: '' } }))
  }

  const saveService = async (serviceId: number, categoryId: number) => {
    const draft = drafts[serviceId]
    if (!draft) return
    const ok = await call(`/api/catalog/services/${serviceId}`, 'PATCH', {
      name: draft.name,
      nameEn: draft.nameEn,
      price: draft.price,
      image: draft.image,
      categoryId,
    })
    if (ok) {
      setDrafts((current) => {
        const next = { ...current }
        delete next[serviceId]
        return next
      })
    }
  }

  const deleteService = async (service: CatalogService) => {
    if (!confirm(`Xóa dịch vụ "${service.name}"?`)) return
    await call(`/api/catalog/services/${service.id}`, 'DELETE')
  }

  return (
    <div className="min-h-screen bg-camel-50 text-camel-900">
      <AdminHeader />
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-camel-900">Quản lý dịch vụ</h1>
            <p className="mt-1 text-sm text-camel-600">Các mục và dịch vụ tại đây sẽ hiển thị trên bảng giá của website khách.</p>
          </div>
          <button
            onClick={() => setShowAddCategory((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full bg-camel-800 px-5 py-2.5 text-sm font-medium text-camel-50 transition hover:bg-camel-700"
          >
            <FolderPlus size={15} /> Thêm mục
          </button>
        </div>

        {showAddCategory && (
          <div className="mt-5 rounded-2xl border border-camel-300 bg-camel-100/60 p-5">
            <p className="text-sm font-bold uppercase tracking-wide text-camel-700">Mục mới</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
              <label className="text-xs font-semibold text-camel-700">
                Tên mục (tiếng Việt) *
                <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="VD: Chăm sóc da" className={`mt-1 ${inputClass}`} />
              </label>
              <label className="text-xs font-semibold text-camel-700">
                Tên tiếng Anh
                <input value={newCategoryNameEn} onChange={(e) => setNewCategoryNameEn(e.target.value)} placeholder="VD: Skin care" className={`mt-1 ${inputClass}`} />
              </label>
              <div className="flex gap-2">
                <button onClick={addCategory} disabled={busy} className="rounded-full bg-camel-800 px-5 py-2.5 text-xs font-semibold text-camel-50 transition hover:bg-camel-700 disabled:opacity-50">
                  Tạo mục
                </button>
                <button onClick={() => setShowAddCategory(false)} className="rounded-full border border-camel-300 bg-camel-50 px-3 py-2.5 text-camel-700 transition hover:bg-camel-200">
                  <X size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <div key={index} className="mt-5 h-40 animate-pulse rounded-2xl border border-camel-200 bg-camel-100/50" />)
        ) : (
          <div className="mt-5 space-y-5">
            {categories.map((category) => (
              <section key={category.id} className="rounded-2xl border border-camel-200 bg-camel-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-camel-200 pb-3">
                  {renamingId === category.id ? (
                    <div className="grid w-full gap-2 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
                      <input value={renameDraft.name} onChange={(e) => setRenameDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Tên mục" className={inputClass} />
                      <input value={renameDraft.nameEn} onChange={(e) => setRenameDraft((d) => ({ ...d, nameEn: e.target.value }))} placeholder="Tên tiếng Anh" className={inputClass} />
                      <div className="flex gap-2">
                        <button onClick={() => saveRename(category)} disabled={busy} className="rounded-full bg-camel-800 px-4 py-2 text-[13px] font-medium text-camel-50 transition hover:bg-camel-700 disabled:opacity-50">
                          Lưu
                        </button>
                        <button onClick={() => setRenamingId(null)} className="rounded-full border border-camel-300 bg-camel-100 px-3 py-2 text-camel-700">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h2 className="font-serif text-2xl text-camel-900">{category.name}</h2>
                        <p className="mt-0.5 text-xs text-camel-500">
                          {category.services.length} dịch vụ{category.nameEn ? ` · ${category.nameEn}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setRenamingId(category.id)
                            setRenameDraft({ name: category.name, nameEn: category.nameEn ?? '' })
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-camel-300 bg-camel-100 px-3.5 py-2 text-[13px] font-medium text-camel-800 transition hover:bg-camel-200"
                        >
                          <Pencil size={12} /> Đổi tên
                        </button>
                        <button
                          onClick={() => deleteCategory(category)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-[13px] font-medium text-red-700 transition hover:bg-red-100"
                        >
                          <Trash2 size={12} /> Xóa mục
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {category.services.map((service) => {
                    const editing = drafts[service.id] !== undefined
                    return (
                      <div key={service.id} className="rounded-xl border border-camel-200 bg-camel-100/40 p-3">
                        {editing ? (
                          <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_0.8fr_1.2fr_auto] md:items-end">
                            <input value={drafts[service.id].name} onChange={(e) => setDrafts((d) => ({ ...d, [service.id]: { ...d[service.id], name: e.target.value } }))} placeholder="Tên dịch vụ" className={inputClass} />
                            <input value={drafts[service.id].nameEn} onChange={(e) => setDrafts((d) => ({ ...d, [service.id]: { ...d[service.id], nameEn: e.target.value } }))} placeholder="Tên tiếng Anh" className={inputClass} />
                            <input value={drafts[service.id].price} onChange={(e) => setDrafts((d) => ({ ...d, [service.id]: { ...d[service.id], price: formatPriceTyping(e.target.value) } }))} placeholder="Giá: 400.000" className={inputClass} />
                            <input value={drafts[service.id].image} onChange={(e) => setDrafts((d) => ({ ...d, [service.id]: { ...d[service.id], image: e.target.value } }))} placeholder="Link ảnh (tùy chọn)" className={inputClass} />
                            <div className="flex gap-2">
                              <button onClick={() => saveService(service.id, category.id)} disabled={busy} className="rounded-full bg-camel-800 px-4 py-2 text-[13px] font-medium text-camel-50 transition hover:bg-camel-700 disabled:opacity-50">
                                Lưu
                              </button>
                              <button
                                onClick={() =>
                                  setDrafts((current) => {
                                    const next = { ...current }
                                    delete next[service.id]
                                    return next
                                  })
                                }
                                className="rounded-full border border-camel-300 bg-camel-50 px-3 py-2 text-camel-700"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            {parsePriceVnd(drafts[service.id].price) > 0 && (
                              <p className="text-[11px] text-camel-500 md:col-span-5">Tính tiền: {parsePriceVnd(drafts[service.id].price).toLocaleString('vi-VN')}₫</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-camel-900">
                                {service.name}
                                {service.image && <ImageIcon size={12} className="ml-1.5 inline text-camel-400" />}
                              </p>
                              <p className="text-xs text-camel-500">{formatPriceVnd(service.price)}{service.nameEn ? ` · ${service.nameEn}` : ''}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setDrafts((d) => ({ ...d, [service.id]: { name: service.name, nameEn: service.nameEn, price: service.price, image: service.image ?? '' } }))}
                                className="inline-flex items-center gap-1.5 rounded-full border border-camel-300 bg-camel-50 px-3.5 py-1.5 text-[13px] font-medium text-camel-800 transition hover:bg-camel-200"
                              >
                                <Pencil size={12} /> Sửa
                              </button>
                              <button
                                onClick={() => deleteService(service)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-[13px] font-medium text-red-700 transition hover:bg-red-100"
                              >
                                <Trash2 size={12} /> Xóa
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 grid gap-2 rounded-xl border border-dashed border-camel-300 p-3 md:grid-cols-[1.5fr_1fr_0.8fr_1.2fr_auto] md:items-end">
                  <input
                    value={newService[category.id]?.name ?? ''}
                    onChange={(e) => setNewService((s) => ({ ...s, [category.id]: { name: e.target.value, nameEn: s[category.id]?.nameEn ?? '', price: s[category.id]?.price ?? '', image: s[category.id]?.image ?? '' } }))}
                    placeholder="Tên dịch vụ mới *"
                    className={inputClass}
                  />
                  <input
                    value={newService[category.id]?.nameEn ?? ''}
                    onChange={(e) => setNewService((s) => ({ ...s, [category.id]: { name: s[category.id]?.name ?? '', nameEn: e.target.value, price: s[category.id]?.price ?? '', image: s[category.id]?.image ?? '' } }))}
                    placeholder="Tên tiếng Anh"
                    className={inputClass}
                  />
                  <input
                    value={newService[category.id]?.price ?? ''}
                    onChange={(e) => setNewService((s) => ({ ...s, [category.id]: { name: s[category.id]?.name ?? '', nameEn: s[category.id]?.nameEn ?? '', price: formatPriceTyping(e.target.value), image: s[category.id]?.image ?? '' } }))}
                    placeholder="Giá: 400.000 *"
                    className={inputClass}
                  />
                  <input
                    value={newService[category.id]?.image ?? ''}
                    onChange={(e) => setNewService((s) => ({ ...s, [category.id]: { name: s[category.id]?.name ?? '', nameEn: s[category.id]?.nameEn ?? '', price: s[category.id]?.price ?? '', image: e.target.value } }))}
                    placeholder="Link ảnh (tùy chọn)"
                    className={inputClass}
                  />
                  <button onClick={() => addService(category.id)} disabled={busy} className="rounded-full bg-camel-800 px-4 py-2.5 text-[13px] font-medium text-camel-50 transition hover:bg-camel-700 disabled:opacity-50">
                    Thêm dịch vụ
                  </button>
                  {parsePriceVnd(newService[category.id]?.price ?? '') > 0 && (
                    <p className="text-[11px] text-camel-500 md:col-span-5">Tính tiền: {parsePriceVnd(newService[category.id]?.price ?? '').toLocaleString('vi-VN')}₫</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
