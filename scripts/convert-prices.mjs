// Chạy một lần: node scripts/convert-prices.mjs
// Đổi giá viết tắt "400k" cũ sang dạng đầy đủ "400.000" (dấu chấm phân cách hàng nghìn,
// bỏ chữ k) cho cả Service.price lẫn snapshot services JSON trong Booking.
// Idempotent: chạy lại không đổi gì thêm.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const convert = (price) =>
  typeof price === 'string'
    ? price.replace(/(\d+)\s*k(?![a-z0-9])/gi, (_, n) => (Number(n) * 1000).toLocaleString('vi-VN'))
    : price

try {
  const services = await prisma.service.findMany({ select: { id: true, price: true } })
  let serviceCount = 0
  for (const service of services) {
    const price = convert(service.price)
    if (price !== service.price) {
      await prisma.service.update({ where: { id: service.id }, data: { price } })
      serviceCount += 1
    }
  }

  const bookings = await prisma.booking.findMany({ select: { id: true, services: true } })
  let bookingCount = 0
  for (const booking of bookings) {
    if (!Array.isArray(booking.services)) continue
    let changed = false
    const snapshot = booking.services.map((entry) => {
      if (entry && typeof entry.price === 'string') {
        const price = convert(entry.price)
        if (price !== entry.price) {
          changed = true
          return { ...entry, price }
        }
      }
      return entry
    })
    if (changed) {
      await prisma.booking.update({ where: { id: booking.id }, data: { services: snapshot } })
      bookingCount += 1
    }
  }

  console.log(`Đã đổi giá: ${serviceCount}/${services.length} dịch vụ, ${bookingCount}/${bookings.length} booking (snapshot).`)
} finally {
  await prisma.$disconnect()
}
