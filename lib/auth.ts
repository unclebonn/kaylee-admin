import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type AdminSession = { username: string }

// Backend NestJS (kaylee-api). Trên Vercel set biến API_URL (VD: http://<vps>:3001).
const API_URL = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '')

// Kiểm tra session admin bằng cách hỏi trực tiếp backend
// (không còn tự verify HMAC ở frontend — logic auth sống ở kaylee-api).
export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('kaylee_admin_session')?.value
  if (!token) return null
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { cookie: `kaylee_admin_session=${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as AdminSession
  } catch {
    return null
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}
