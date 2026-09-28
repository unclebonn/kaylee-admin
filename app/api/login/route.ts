import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { SESSION_COOKIE, SESSION_TTL_SECONDS, clearFailedLogins, clientIp, createSessionToken, rateLimitWaitMinutes, recordFailedLogin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const ip = clientIp(request)
  const waitMinutes = rateLimitWaitMinutes(ip)
  if (waitMinutes !== null) {
    return NextResponse.json({ error: `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${waitMinutes} phút.` }, { status: 429 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 })
  }

  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!username || !password) {
    return NextResponse.json({ error: 'Vui lòng nhập tài khoản và mật khẩu.' }, { status: 400 })
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { username } })
    const valid = admin ? await bcrypt.compare(password, admin.passwordHash) : false
    if (!valid) {
      recordFailedLogin(ip)
      return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không đúng.' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Không thể đăng nhập ngay bây giờ. Vui lòng kiểm tra kết nối database.' }, { status: 500 })
  }

  clearFailedLogins(ip)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, createSessionToken(username), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  })
  return response
}
