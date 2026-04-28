import { supabase } from '@/lib/supabase'
import type { NotificationSettings } from '@/types'

export async function getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
  const { data } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data
}

export async function upsertNotificationSettings(
  userId: string,
  settings: Partial<Omit<NotificationSettings, 'user_id' | 'updated_at'>>
): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from('notification_settings')
    .upsert({ ...settings, user_id: userId, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}
