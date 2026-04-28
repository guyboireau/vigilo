import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useSession, useProfile } from '@/hooks/useAuth'
import { useTriggerAllHealthChecks } from '@/hooks/useHealth'

export default function Layout() {
  const session = useSession()
  const { data: profile } = useProfile(session?.user)
  const triggerAll = useTriggerAllHealthChecks(session?.user?.id ?? '')

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (session === null) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        profile={profile}
        onAnalyze={() => triggerAll.mutate()}
        analyzing={triggerAll.isPending}
      />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  )
}
