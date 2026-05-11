import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useNotificationSettings,
  useUpsertNotificationSettings,
} from '@/hooks/useNotifications'
import * as notificationsService from '@/services/notifications'
import type { NotificationSettings } from '@/types'
import type { ReactNode } from 'react'

vi.mock('@/services/notifications')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const mockSettings: NotificationSettings = {
  user_id: 'user-123',
  email_on_failure: true,
  email_on_recovery: false,
  email_daily: true,
  slack_webhook: 'https://hooks.slack.com/test',
  discord_webhook: null,
  updated_at: '2024-03-15T10:00:00Z',
}

describe('useNotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('récupère les paramètres de notification', async () => {
    vi.mocked(notificationsService.getNotificationSettings).mockResolvedValueOnce(mockSettings)

    const { result } = renderHook(() => useNotificationSettings('user-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).toEqual(mockSettings)
    })

    expect(notificationsService.getNotificationSettings).toHaveBeenCalledWith('user-123')
  })

  it('ne fait pas de requête si userId est vide', () => {
    const { result } = renderHook(() => useNotificationSettings(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})

describe('useUpsertNotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('met à jour les paramètres de notification', async () => {
    vi.mocked(notificationsService.upsertNotificationSettings).mockResolvedValueOnce(mockSettings)

    const { result } = renderHook(() => useUpsertNotificationSettings('user-123'), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      email_on_failure: false,
      slack_webhook: 'https://hooks.slack.com/new',
    })

    expect(notificationsService.upsertNotificationSettings).toHaveBeenCalledWith(
      'user-123',
      { email_on_failure: false, slack_webhook: 'https://hooks.slack.com/new' }
    )
  })
})
