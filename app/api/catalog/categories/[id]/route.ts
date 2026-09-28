import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { validateCategoryName } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

// PATCH /api/catalog/categories/[id] — đổi tên / thứ tự mục
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })

  const { id } = await params
  const categoryId = Number(id)
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return NextResponse.json({ error: 'ID mục không hợp lệ.' }, { status: 400 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 })
  }

  const data: { name?: string; nameEn?: string | null; sortOrder?: number } = {}
  if (body?.name !== undefined) {
    const name = validateCategoryName(body.name)
    if (!name) return NextResponse.json({ error: 'Tên mục không được để trống (tối đa 60 ký tự).' }, { status: 400 })
    data.name = name
  }
  if (body?.nameEn !== undefined) {
    data.nameEn = typeof body.nameEn === 'string' && body.nameEn.trim() ? body.nameEn.trim().slice(0, 120) : null
  }
  if (body?.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder)) return NextResponse.json({ error: 'Thứ tự phải là số nguyên.' }, { status: 400 })
    data.sortOrder = body.sortOrder
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Không có thay đổi nào.' }, { status: 400 })

  try {
    const category = await prisma.category.update({ where: { id: categoryId }, data })
    return NextResponse.json({ ok: true, category })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Tên mục này đã tồn tại.' }, { status: 409 })
    }
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Không tìm thấy mục này.' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Không thể cập nhật mục. Vui lòng thử lại.' }, { status: 500 })
  }
}

// DELETE /api/catalog/categories/[id] — chỉ cho phép xóa mục trống
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })

  const { id } = await params
  const categoryId = Number(id)
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return NextResponse.json({ error: 'ID mục không hợp lệ.' }, { status: 400 })
  }

  try {
    const serviceCount = await prisma.service.count({ where: { categoryId } })
    if (serviceCount > 0) {
      return NextResponse.json(
        { error: `Mục này còn ${serviceCount} dịch vụ. Hãy xóa hoặc chuyển các dịch vụ sang mục khác trước.` },
        { status: 409 },
      )
    }
    await prisma.category.delete({ where: { id: categoryId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Không tìm thấy mục này.' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Không thể xóa mục. Vui lòng thử lại.' }, { status: 500 })
  }
}
