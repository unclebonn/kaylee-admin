export function validateCategoryName(raw: unknown) {
  const name = typeof raw === 'string' ? raw.trim() : ''
  if (name.length < 1 || name.length > 60) return null
  return name
}

export function validateServiceName(raw: unknown) {
  const name = typeof raw === 'string' ? raw.trim() : ''
  if (name.length < 1 || name.length > 120) return null
  return name
}

export function validatePrice(raw: unknown) {
  const price = typeof raw === 'string' ? raw.trim() : ''
  if (price.length < 1 || price.length > 40) return null
  // Giá dùng dạng đầy đủ 400.000 — không chấp nhận viết tắt "k"
  if (/k/i.test(price)) return null
  return price
}

export function isPrismaError(error: unknown, code: string) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === code
}
