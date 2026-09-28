import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { validateCategoryName } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

// POST /api/catalog/categories — tạo mục mới
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 })
  }

  const name = validateCategoryName(body?.name)
  if (!name) return NextResponse.json({ error: 'Tên mục không được để trống (tối đa 60 ký tự).' }, { status: 400 })
  const nameEn = typeof body?.nameEn === 'string' && body.nameEn.trim() ? body.nameEn.trim().slice(0, 120) : null

  try {
    const exists = await prisma.category.findUnique({ where: { name } })
    if (exists) return NextResponse.json({ error: `Mục "${name}" đã tồn tại.` }, { status: 409 })

    const maxOrder = await prisma.category.aggregate({ _max: { sortOrder: true } })
    const category = await prisma.category.create({
      data: {
        name,
        nameEn,
        sortOrder: Number.isInteger(body?.sortOrder) ? body.sortOrder : (maxOrder._max.sortOrder ?? 0) + 1,
      },
    })
    return NextResponse.json({ ok: true, category }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Không thể tạo mục. Vui lòng thử lại.' }, { status: 500 })
  }
}
