import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { todayDateString, toDateString, parsePriceVnd } from '@/lib/booking'

export const dynamic = 'force-dynamic'

const MONTH_RE = /^\d{4}-\d{2}$/
// Doanh thu chỉ tính booking đã hoàn thành (khách đã được phục vụ)
const REVENUE_STATUS = 'COMPLETED' as const
// Lượt sử dụng dịch vụ đếm trên mọi lịch chưa hủy
const USAGE_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED'] as const

type ServiceLike = { vi?: string; price?: string }

// GET /api/stats?month=YYYY-MM — doanh thu, lịch chưa tới, top dịch vụ
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })

  const monthParam = request.nextUrl.searchParams.get('month') ?? ''
  const now = new Date()
  const month = MONTH_RE.test(monthParam)
    ? monthParam
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  const from = `${month}-01`
  const to = `${month}-${String(lastDay).padStart(2, '0')}`
  const today = todayDateString()

  try {
    const [totalAggregate, todayAggregate, monthAggregate, upcomingCount, monthByDay, usageBookings] = await Promise.all([
      prisma.booking.aggregate({
        where: { status: REVENUE_STATUS },
        _sum: { totalPrice: true },
        _count: true,
      }),
      prisma.booking.aggregate({
        where: { status: REVENUE_STATUS, bookingDate: today },
        _sum: { totalPrice: true },
        _count: true,
      }),
      prisma.booking.aggregate({
        where: { status: REVENUE_STATUS, bookingDate: { gte: from, lte: to } },
        _sum: { totalPrice: true },
        _count: true,
      }),
      prisma.booking.count({
        where: { bookingDate: { gte: today }, status: { in: ['PENDING', 'CONFIRMED'] } },
      }),
      prisma.booking.groupBy({
        by: ['bookingDate'],
        where: { status: REVENUE_STATUS, bookingDate: { gte: from, lte: to } },
        _sum: { totalPrice: true },
        _count: true,
      }),
      prisma.booking.findMany({
        where: { status: { in: [...USAGE_STATUSES] } },
        select: { services: true, totalPrice: true },
      }),
    ])

    const perDay: { date: string; revenue: number; count: number }[] = []
    for (let day = 1; day <= lastDay; day += 1) {
      const date = toDateString(new Date(year, monthNumber - 1, day))
      perDay.push({ date, revenue: 0, count: 0 })
    }
    const dayIndex = new Map(perDay.map((entry) => [entry.date, entry]))
    for (const row of monthByDay) {
      const entry = dayIndex.get(row.bookingDate)
      if (entry) {
        entry.revenue = row._sum.totalPrice ?? 0
        entry.count = row._count
      }
    }

    // Đếm số lần dùng từng dịch vụ từ snapshot JSON trong booking
    const usage = new Map<string, { count: number; revenue: number }>()
    for (const booking of usageBookings) {
      const services = Array.isArray(booking.services) ? (booking.services as ServiceLike[]) : []
      for (const service of services) {
        if (!service?.vi) continue
        const entry = usage.get(service.vi) ?? { count: 0, revenue: 0 }
        entry.count += 1
        entry.revenue += parsePriceVnd(service.price ?? '')
        usage.set(service.vi, entry)
      }
    }
    const topServices = [...usage.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
      .slice(0, 5)

    return NextResponse.json({
      month,
      totalRevenue: totalAggregate._sum.totalPrice ?? 0,
      totalBookings: totalAggregate._count,
      todayRevenue: todayAggregate._sum.totalPrice ?? 0,
      todayBookings: todayAggregate._count,
      monthRevenue: monthAggregate._sum.totalPrice ?? 0,
      upcomingCount,
      perDay,
      topServices,
    })
  } catch {
    return NextResponse.json({ error: 'Không thể tải thống kê. Vui lòng kiểm tra kết nối database.' }, { status: 500 })
  }
}
