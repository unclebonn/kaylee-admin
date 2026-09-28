import { requireAdmin } from '@/lib/auth'
import ServicesManager from '@/components/ServicesManager'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
  await requireAdmin()
  return <ServicesManager />
}
