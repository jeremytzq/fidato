import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import { NotificationProvider } from '@/components/layout/NotificationProvider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0 min-w-0">
        {children}
      </main>
      <MobileNav user={user} />
      <NotificationProvider userId={user.id} />
    </div>
  )
}
