import { useState } from 'react'
import { Check, ChevronDown, Plus, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrg, useCreateOrg } from '@/hooks/useOrg'
import { getPlanLabel } from '@/services/billing'
import type { OrgWithPlan } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const PLAN_COLORS: Record<string, string> = {
  free: 'text-muted-foreground',
  solo: 'text-blue-400',
  agency: 'text-amber-400',
}

export default function OrgSwitcher() {
  const { currentOrg, orgs, switchOrg } = useOrg()
  const createOrg = useCreateOrg()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  if (!currentOrg) return null

  async function handleCreate() {
    if (!newName.trim()) return
    await createOrg.mutateAsync(newName.trim())
    setNewName('')
    setCreating(false)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-sidebar-accent/20">
          <Building2 className="h-3.5 w-3.5 text-sidebar-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{currentOrg.name}</p>
          <p className={cn('text-[10px] leading-none', PLAN_COLORS[currentOrg.plan_id])}>
            {getPlanLabel(currentOrg.plan_id)}
          </p>
        </div>
        <ChevronDown className={cn('h-3.5 w-3.5 text-sidebar-foreground/40 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setCreating(false) }} />
          <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-lg border border-sidebar-border bg-sidebar shadow-lg py-1 overflow-hidden">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Espaces de travail
            </p>
            {orgs.map(org => (
              <OrgItem
                key={org.id}
                org={org}
                isActive={org.id === currentOrg.id}
                onSelect={() => { switchOrg(org.id); setOpen(false) }}
              />
            ))}

            <div className="border-t border-sidebar-border mt-1 pt-1">
              {creating ? (
                <div className="px-2 py-1.5 space-y-1.5">
                  <Input
                    autoFocus
                    className="h-7 text-xs"
                    placeholder="Nom de l'espace"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                  />
                  <div className="flex gap-1.5">
                    <Button size="sm" className="flex-1 h-6 text-xs" onClick={handleCreate} loading={createOrg.isPending}>
                      Créer
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setCreating(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouvel espace
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function OrgItem({ org, isActive, onSelect }: { org: OrgWithPlan; isActive: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors',
        isActive ? 'bg-white/10 text-white' : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground'
      )}
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sidebar-accent/20 text-sidebar-accent text-[10px] font-bold">
        {org.name[0].toUpperCase()}
      </div>
      <span className="flex-1 truncate">{org.name}</span>
      {isActive && <Check className="h-3.5 w-3.5 text-sidebar-accent shrink-0" />}
    </button>
  )
}
