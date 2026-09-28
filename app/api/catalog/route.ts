import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/catalog — danh mục + dịch vụ (dùng cho trang quản lý và form thêm lịch)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })

  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        services: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: { id: true, name: true, nameEn: true, price: true, image: true, sortOrder: true },
        },
      },
    })
    return NextResponse.json({ categories })
  } catch {
    return NextResponse.json({ error: 'Không thể tải danh mục dịch vụ.' }, { status: 500 })
  }
}
