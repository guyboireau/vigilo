import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderGit2, Settings, Shield, LogOut, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useSignOut } from '@/hooks/useAuth'
import type { Profile } from '@/types'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderGit2, label: 'Projets' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
]

interface SidebarProps {
  profile: Profile | null | undefined
  onAnalyze: () => void
  analyzing: boolean
}

export default function Sidebar({ profile, onAnalyze, analyzing }: SidebarProps) {
  const signOut = useSignOut()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut.mutate(undefined, { onSuccess: () => navigate('/login') })
  }

  const initials = profile?.name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  return (
    <aside className="flex h-screen w-56 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">CIdar</p>
          <p className="text-[10px] text-sidebar-foreground/50 leading-none">Infra Health</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent/20 text-sidebar-accent font-medium border-l-2 border-sidebar-accent'
                  : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Analyze button */}
      <div className="px-3 pb-3">
        <Button
          className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          size="sm"
          onClick={onAnalyze}
          loading={analyzing}
        >
          <Zap className="h-4 w-4" />
          {analyzing ? 'Analyse...' : 'Analyser tout'}
        </Button>
      </div>

      {/* User */}
      <div className="border-t border-sidebar-border px-3 py-3 flex items-center gap-2.5">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-sidebar-accent/20 text-sidebar-accent text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{profile?.name ?? profile?.email ?? '—'}</p>
          <p className="text-[10px] text-sidebar-foreground/50 truncate">{profile?.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
          title="Déconnexion"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
