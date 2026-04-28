import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getNotificationSettings, upsertNotificationSettings } from '@/services/notifications'
import type { NotificationSettings } from '@/types'

export function useNotificationSettings(userId: string) {
  return useQuery({
    queryKey: ['notif-settings', userId],
    queryFn: () => getNotificationSettings(userId),
    enabled: !!userId,
  })
}

export function useUpsertNotificationSettings(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: Partial<Omit<NotificationSettings, 'user_id' | 'updated_at'>>) =>
      upsertNotificationSettings(userId, settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-settings', userId] })
      toast.success('Préférences enregistrées')
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })
}
