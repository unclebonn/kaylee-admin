import { requireAdmin } from '@/lib/auth'
import AdminDashboard from '@/components/AdminDashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await requireAdmin()
  return <AdminDashboard username={session.username} />
}
