import { NextRequest, NextResponse } from 'next/server'
import type { BookingStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { todayDateString, validateBookingInput } from '@/lib/booking'

export const dynamic = 'force-dynamic'

const STATUS_VALUES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

// GET /api/bookings?date=&status=&q= — danh sách + thống kê
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const date = params.get('date') ?? ''
  const status = params.get('status') ?? ''
  const query = (params.get('q') ?? '').trim()

  const where: Prisma.BookingWhereInput = {}
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) where.bookingDate = date
  if (STATUS_VALUES.includes(status as BookingStatus)) where.status = status as BookingStatus
  if (query) {
    where.OR = [
      { customerName: { contains: query, mode: 'insensitive' } },
      { phone: { contains: query } },
    ]
  }

  try {
    const [bookings, today, pending, confirmed, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: [{ bookingDate: 'desc' }, { bookingTime: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      prisma.booking.count({ where: { bookingDate: todayDateString(), status: { not: 'CANCELLED' } } }),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.booking.count(),
    ])
    return NextResponse.json({ bookings, stats: { today, pending, confirmed, total } })
  } catch {
    return NextResponse.json({ error: 'Không thể tải danh sách lịch. Vui lòng kiểm tra kết nối database.' }, { status: 500 })
  }
}

// POST /api/bookings — admin tạo lịch cho khách tại quầy (walk-in)
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 })
  }

  const result = validateBookingInput(body)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })

  const { name, phone, date, time, services, totalPrice } = result.data
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : ''
  const status: BookingStatus = body?.status === 'PENDING' ? 'PENDING' : 'CONFIRMED'

  try {
    const conflict = await prisma.booking.count({
      where: { bookingDate: date, bookingTime: time, status: { not: 'CANCELLED' } },
    })
    if (conflict > 0) {
      return NextResponse.json({ error: 'Khung giờ này đã có lịch. Vui lòng chọn giờ khác.' }, { status: 409 })
    }

    const booking = await prisma.booking.create({
      data: {
        customerName: name,
        phone,
        source: 'WALKIN',
        services: services as unknown as Prisma.InputJsonValue,
        totalPrice,
        bookingDate: date,
        bookingTime: time,
        status,
        note: note || null,
      },
    })
    return NextResponse.json({ ok: true, booking }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Không thể tạo lịch ngay bây giờ. Vui lòng thử lại.' }, { status: 500 })
  }
}
