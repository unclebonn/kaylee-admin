import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/bookings/[id]/share — sinh (hoặc lấy lại) link bill công khai cho khách
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })

  const { id } = await params
  const bookingId = Number(id)
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: 'ID lịch không hợp lệ.' }, { status: 400 })
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true, shareToken: true } })
    if (!booking) return NextResponse.json({ error: 'Không tìm thấy lịch này.' }, { status: 404 })

    const token = booking.shareToken ?? randomBytes(16).toString('hex')
    if (token !== booking.shareToken) {
      await prisma.booking.update({ where: { id: bookingId }, data: { shareToken: token } })
    }

    const base = process.env.NEXT_PUBLIC_BILL_BASE_URL || 'http://localhost:3000'
    return NextResponse.json({ ok: true, url: `${base.replace(/\/$/, '')}/bill/${token}` })
  } catch {
    return NextResponse.json({ error: 'Không thể tạo link chia sẻ. Vui lòng thử lại.' }, { status: 500 })
  }
}
