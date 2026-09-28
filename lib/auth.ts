import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'kaylee_admin_session'
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

function authSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('Thiếu biến môi trường AUTH_SECRET')
  return secret
}

function signPayload(payload: string) {
  return createHmac('sha256', authSecret()).update(payload).digest('base64url')
}

export function createSessionToken(username: string) {
  const payload = Buffer.from(JSON.stringify({ sub: username, exp: Date.now() + SESSION_TTL_SECONDS * 1000 })).toString('base64url')
  return `${payload}.${signPayload(payload)}`
}

export function verifySessionToken(token: string | undefined) {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = Buffer.from(signPayload(payload))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sub?: unknown; exp?: unknown }
    if (typeof data.exp !== 'number' || data.exp < Date.now() || typeof data.sub !== 'string') return null
    return { username: data.sub }
  } catch {
    return null
  }
}

// Đọc session trong server component lẫn route handler
export async function getSession() {
  const cookieStore = await cookies()
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
}

// Server component: chuyển hướng về /login nếu chưa đăng nhập
export async function requireAdmin() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

// ----- Chống dò mật khẩu: 5 lần sai / 15 phút / IP -----
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

export function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'local'
}

// Trả về số phút còn lại phải chờ, hoặc null nếu được phép thử
export function rateLimitWaitMinutes(ip: string) {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry) return null
  if (entry.resetAt <= now) {
    loginAttempts.delete(ip)
    return null
  }
  if (entry.count < MAX_ATTEMPTS) return null
  return Math.max(1, Math.ceil((entry.resetAt - now) / 60000))
}

export function recordFailedLogin(ip: string) {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count += 1
  }
  if (loginAttempts.size > 500) {
    for (const [key, value] of loginAttempts) if (value.resetAt <= now) loginAttempts.delete(key)
  }
}

export function clearFailedLogins(ip: string) {
  loginAttempts.delete(ip)
}
