import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useLinkedAccounts,
  useUpsertLinkedAccount,
  useDeleteLinkedAccount,
} from '@/hooks/useIntegrations'
import * as integrationsService from '@/services/integrations'
import type { Provider } from '@/types'
import type { ReactNode } from 'react'

vi.mock('@/services/integrations')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const mockAccounts = [
  {
    id: 'acc-1',
    user_id: 'user-123',
    provider: 'github' as Provider,
    username: 'guyboireau',
    metadata: {},
    created_at: '2024-01-15T10:00:00Z',
  },
]

describe('useLinkedAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('récupère les comptes liés', async () => {
    vi.mocked(integrationsService.getLinkedAccounts).mockResolvedValueOnce(mockAccounts)

    const { result } = renderHook(() => useLinkedAccounts('user-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).toEqual(mockAccounts)
    })

    expect(integrationsService.getLinkedAccounts).toHaveBeenCalledWith('user-123')
  })

  it('ne fait pas de requête si userId est undefined', () => {
    const { result } = renderHook(() => useLinkedAccounts(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})

describe('useUpsertLinkedAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ajoute ou met à jour un compte lié', async () => {
    vi.mocked(integrationsService.upsertLinkedAccount).mockResolvedValueOnce(mockAccounts[0])

    const { result } = renderHook(() => useUpsertLinkedAccount('user-123'), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      provider: 'github',
      token: 'ghp_xxx',
      username: 'guyboireau',
    })

    expect(integrationsService.upsertLinkedAccount).toHaveBeenCalledWith(
      'user-123',
      'github',
      'ghp_xxx',
      'guyboireau'
    )
  })
})

describe('useDeleteLinkedAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('supprime un compte lié', async () => {
    vi.mocked(integrationsService.deleteLinkedAccount).mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useDeleteLinkedAccount('user-123'), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('github')

    expect(integrationsService.deleteLinkedAccount).toHaveBeenCalledWith('user-123', 'github')
  })
})
