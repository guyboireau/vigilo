import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/contexts/OrgContext'
import {
  getOrgMembers,
  getInvitations,
  inviteMember,
  revokeInvitation,
  removeMember,
  updateMemberRole,
  createOrg,
} from '@/services/organizations'
import type { OrgRole } from '@/types'
import { useSession } from './useAuth'

export { useOrg }

export function useOrgMembers() {
  const { currentOrg } = useOrg()
  return useQuery({
    queryKey: ['org-members', currentOrg?.id],
    queryFn: () => getOrgMembers(currentOrg!.id),
    enabled: !!currentOrg?.id,
  })
}

export function useInvitations() {
  const { currentOrg } = useOrg()
  return useQuery({
    queryKey: ['org-invitations', currentOrg?.id],
    queryFn: () => getInvitations(currentOrg!.id),
    enabled: !!currentOrg?.id,
  })
}

export function useInviteMember() {
  const { currentOrg, refreshOrgs } = useOrg()
  const session = useSession()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: 'admin' | 'member' }) =>
      inviteMember(currentOrg!.id, email, role, session!.user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-invitations', currentOrg?.id] })
      refreshOrgs()
    },
  })
}

export function useRevokeInvitation() {
  const { currentOrg } = useOrg()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(invitationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-invitations', currentOrg?.id] }),
  })
}

export function useRemoveMember() {
  const { currentOrg } = useOrg()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeMember(currentOrg!.id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-members', currentOrg?.id] }),
  })
}

export function useUpdateMemberRole() {
  const { currentOrg } = useOrg()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: OrgRole }) =>
      updateMemberRole(currentOrg!.id, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-members', currentOrg?.id] }),
  })
}

export function useCreateOrg() {
  const session = useSession()
  const { refreshOrgs, switchOrg } = useOrg()
  return useMutation({
    mutationFn: (name: string) => createOrg(name, session!.user.id),
    onSuccess: async (org) => {
      await refreshOrgs()
      await switchOrg(org.id)
    },
  })
}
