import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { OrgWithPlan } from '@/types'
import { getUserOrgs, setCurrentOrg } from '@/services/organizations'
import { useSession, useProfile } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'

interface OrgContextValue {
  currentOrg: OrgWithPlan | null
  orgs: OrgWithPlan[]
  isLoading: boolean
  switchOrg: (orgId: string) => Promise<void>
  refreshOrgs: () => Promise<void>
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function OrgProvider({ children }: { children: ReactNode }) {
  const session = useSession()
  const { data: profile } = useProfile(session?.user)
  const queryClient = useQueryClient()

  const [orgs, setOrgs] = useState<OrgWithPlan[]>([])
  const [currentOrg, setCurrentOrgState] = useState<OrgWithPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Référence stable pour éviter les dépendances changeantes
  const userIdRef = session?.user?.id ?? null

  const loadOrgs = useCallback(async (userId: string, preferredOrgId?: string | null) => {
    try {
      const data = await getUserOrgs(userId)
      setOrgs(data)

      const preferred = preferredOrgId
        ? data.find(o => o.id === preferredOrgId)
        : null
      setCurrentOrgState(preferred ?? data[0] ?? null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!userIdRef) {
      // Réinitialisation différée pour éviter setState synchrone dans l'effect
      const timer = setTimeout(() => {
        setOrgs([])
        setCurrentOrgState(null)
        setIsLoading(false)
      }, 0)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    loadOrgs(userIdRef, profile?.current_org_id)
  }, [userIdRef, profile?.current_org_id, loadOrgs])

  const switchOrg = useCallback(async (orgId: string) => {
    if (!userIdRef) return
    const org = orgs.find(o => o.id === orgId)
    if (!org) return
    setCurrentOrgState(org)
    await setCurrentOrg(userIdRef, orgId)
    queryClient.invalidateQueries()
  }, [userIdRef, orgs, queryClient])

  const refreshOrgs = useCallback(async () => {
    if (!userIdRef) return
    await loadOrgs(userIdRef, currentOrg?.id)
  }, [userIdRef, currentOrg?.id, loadOrgs])

  return (
    <OrgContext.Provider value={{ currentOrg, orgs, isLoading, switchOrg, refreshOrgs }}>
      {children}
    </OrgContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useOrg = (): OrgContextValue => {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used inside OrgProvider')
  return ctx
}
