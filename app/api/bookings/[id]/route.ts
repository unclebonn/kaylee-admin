import { NextRequest, NextResponse } from 'next/server'
import type { BookingStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const STATUS_VALUES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

function isPrismaNotFound(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2025'
}

// PATCH /api/bookings/[id] — đổi trạng thái / sửa ghi chú
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })

  const { id } = await params
  const bookingId = Number(id)
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: 'ID lịch không hợp lệ.' }, { status: 400 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 })
  }

  const data: { status?: BookingStatus; note?: string | null; cancelReason?: string | null } = {}
  if (body?.status !== undefined) {
    if (!STATUS_VALUES.includes(body.status)) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ.' }, { status: 400 })
    }
    data.status = body.status
    if (body.status === 'CANCELLED') {
      const reason = typeof body?.cancelReason === 'string' ? body.cancelReason.trim() : ''
      if (reason.length < 1) {
        return NextResponse.json({ error: 'Vui lòng nhập lý do hủy lịch.' }, { status: 400 })
      }
      data.cancelReason = reason.slice(0, 300)
    } else {
      // mở lại trạng thái khác thì xóa lý do hủy cũ
      data.cancelReason = null
    }
  }
  if (body?.note !== undefined) {
    if (typeof body.note !== 'string') {
      return NextResponse.json({ error: 'Ghi chú không hợp lệ.' }, { status: 400 })
    }
    data.note = body.note.trim().slice(0, 500) || null
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Không có thay đổi nào.' }, { status: 400 })
  }

  try {
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data,
      select: { id: true, status: true, note: true, cancelReason: true },
    })
    return NextResponse.json({ ok: true, booking })
  } catch (error) {
    if (isPrismaNotFound(error)) return NextResponse.json({ error: 'Không tìm thấy lịch này.' }, { status: 404 })
    return NextResponse.json({ error: 'Không thể cập nhật lịch. Vui lòng thử lại.' }, { status: 500 })
  }
}

// DELETE /api/bookings/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })

  const { id } = await params
  const bookingId = Number(id)
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: 'ID lịch không hợp lệ.' }, { status: 400 })
  }

  try {
    await prisma.booking.delete({ where: { id: bookingId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isPrismaNotFound(error)) return NextResponse.json({ error: 'Không tìm thấy lịch này.' }, { status: 404 })
    return NextResponse.json({ error: 'Không thể xóa lịch. Vui lòng thử lại.' }, { status: 500 })
  }
}
