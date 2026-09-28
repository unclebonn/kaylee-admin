import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { validatePrice, validateServiceName } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

// POST /api/catalog/services — thêm dịch vụ vào một mục
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 })
  }

  const categoryId = Number(body?.categoryId)
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return NextResponse.json({ error: 'Mục không hợp lệ.' }, { status: 400 })
  }
  const name = validateServiceName(body?.name)
  if (!name) return NextResponse.json({ error: 'Tên dịch vụ không được để trống (tối đa 120 ký tự).' }, { status: 400 })
  const price = validatePrice(body?.price)
  if (!price) return NextResponse.json({ error: 'Giá không hợp lệ (tối đa 40 ký tự, không dùng chữ k, ví dụ: 400.000).' }, { status: 400 })
  const nameEn = typeof body?.nameEn === 'string' ? body.nameEn.trim().slice(0, 120) : ''
  const image = typeof body?.image === 'string' && body.image.trim() ? body.image.trim().slice(0, 200) : null

  try {
    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category) return NextResponse.json({ error: 'Không tìm thấy mục này.' }, { status: 404 })

    const exists = await prisma.service.findFirst({ where: { categoryId, name } })
    if (exists) return NextResponse.json({ error: `Dịch vụ "${name}" đã có trong mục này.` }, { status: 409 })

    const maxOrder = await prisma.service.aggregate({ where: { categoryId }, _max: { sortOrder: true } })
    const service = await prisma.service.create({
      data: {
        categoryId,
        name,
        nameEn,
        price,
        image,
        sortOrder: Number.isInteger(body?.sortOrder) ? body.sortOrder : (maxOrder._max.sortOrder ?? 0) + 1,
      },
    })
    return NextResponse.json({ ok: true, service }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Không thể thêm dịch vụ. Vui lòng thử lại.' }, { status: 500 })
  }
}
