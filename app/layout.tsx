import type { Metadata, Viewport } from 'next'
import { Noto_Sans, Noto_Serif } from 'next/font/google'
import './globals.css'

const notoSans = Noto_Sans({ subsets: ['latin', 'vietnamese'], variable: '--font-noto-sans' })
const notoSerif = Noto_Serif({ subsets: ['latin', 'vietnamese'], variable: '--font-noto-serif' })

export const metadata: Metadata = { title: 'Kaylee Admin — Quản lý đặt lịch', description: 'Trang quản lý đặt lịch của Kaylee Beauty Studio.' }
export const viewport: Viewport = { colorScheme: 'light', themeColor: '#f8f2ec' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className={`${notoSans.variable} ${notoSerif.variable} bg-camel-50`}><body className="antialiased">{children}</body></html>
}
