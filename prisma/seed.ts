import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { catalogCategories, catalogServices } from '../lib/catalog-data'

const prisma = new PrismaClient()

async function main() {
  // ----- Tài khoản admin -----
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'Kaylee@2026'
  const passwordHash = await bcrypt.hash(password, 10)

  const admin = await prisma.admin.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  })
  console.log(`✔ Tài khoản admin sẵn sàng: "${admin.username}"`)

  // ----- Catalog: 7 mục + 51 dịch vụ (chỉ thêm nếu chưa có, không ghi đè chỉnh sửa của admin) -----
  for (const category of catalogCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: { name: category.name, nameEn: category.nameEn, sortOrder: category.sortOrder },
    })
  }
  let created = 0
  for (const [index, service] of catalogServices.entries()) {
    const category = await prisma.category.findUnique({ where: { name: service.category } })
    if (!category) continue
    const exists = await prisma.service.findFirst({ where: { categoryId: category.id, name: service.name } })
    if (exists) continue
    await prisma.service.create({
      data: {
        categoryId: category.id,
        name: service.name,
        nameEn: service.nameEn,
        price: service.price,
        image: service.image ?? null,
        sortOrder: index + 1,
      },
    })
    created += 1
  }
  console.log(`✔ Catalog sẵn sàng: +${created} dịch vụ mới được thêm`)
}

main()
  .catch((error) => {
    console.error('Seed thất bại:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
