// Kiểu dùng chung của app admin (khớp với JSON trả về từ API)
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
export type BookingSource = 'ONLINE' | 'WALKIN'

export type Booking = {
  id: number
  customerName: string
  phone: string
  source: BookingSource
  services: { vi: string; en: string; price: string; category: string }[]
  totalPrice: number
  bookingDate: string
  bookingTime: string
  status: BookingStatus
  note: string | null
  cancelReason: string | null
  createdAt: string
}
