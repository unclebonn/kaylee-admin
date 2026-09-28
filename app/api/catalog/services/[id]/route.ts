import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { isPrismaError, validatePrice, validateServiceName } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

// PATCH /api/catalog/services/[id] — sửa dịch vụ (tên, giá, ảnh, thứ tự, chuyển mục)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })

  const { id } = await params
  const serviceId = Number(id)
  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    return NextResponse.json({ error: 'ID dịch vụ không hợp lệ.' }, { status: 400 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 })
  }

  const data: { name?: string; nameEn?: string; price?: string; image?: string | null; sortOrder?: number; categoryId?: number } = {}
  if (body?.name !== undefined) {
    const name = validateServiceName(body.name)
    if (!name) return NextResponse.json({ error: 'Tên dịch vụ không được để trống (tối đa 120 ký tự).' }, { status: 400 })
    data.name = name
  }
  if (body?.price !== undefined) {
    const price = validatePrice(body.price)
    if (!price) return NextResponse.json({ error: 'Giá không hợp lệ (tối đa 40 ký tự, không dùng chữ k, ví dụ: 400.000).' }, { status: 400 })
    data.price = price
  }
  if (body?.nameEn !== undefined) {
    data.nameEn = typeof body.nameEn === 'string' ? body.nameEn.trim().slice(0, 120) : ''
  }
  if (body?.image !== undefined) {
    data.image = typeof body.image === 'string' && body.image.trim() ? body.image.trim().slice(0, 200) : null
  }
  if (body?.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder)) return NextResponse.json({ error: 'Thứ tự phải là số nguyên.' }, { status: 400 })
    data.sortOrder = body.sortOrder
  }
  if (body?.categoryId !== undefined) {
    const categoryId = Number(body.categoryId)
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: 'Mục không hợp lệ.' }, { status: 400 })
    }
    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category) return NextResponse.json({ error: 'Không tìm thấy mục đích.' }, { status: 404 })
    data.categoryId = categoryId
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Không có thay đổi nào.' }, { status: 400 })

  try {
    const service = await prisma.service.update({ where: { id: serviceId }, data })
    return NextResponse.json({ ok: true, service })
  } catch (error) {
    if (isPrismaError(error, 'P2025')) return NextResponse.json({ error: 'Không tìm thấy dịch vụ này.' }, { status: 404 })
    return NextResponse.json({ error: 'Không thể cập nhật dịch vụ. Vui lòng thử lại.' }, { status: 500 })
  }
}

// DELETE /api/catalog/services/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })

  const { id } = await params
  const serviceId = Number(id)
  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    return NextResponse.json({ error: 'ID dịch vụ không hợp lệ.' }, { status: 400 })
  }

  try {
    await prisma.service.delete({ where: { id: serviceId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isPrismaError(error, 'P2025')) return NextResponse.json({ error: 'Không tìm thấy dịch vụ này.' }, { status: 404 })
    return NextResponse.json({ error: 'Không thể xóa dịch vụ. Vui lòng thử lại.' }, { status: 500 })
  }
}
