import { describe, it, expect } from 'vitest'
import { cn, formatDate, formatRelative } from '@/lib/utils'

describe('cn', () => {
  it('merge les classes Tailwind sans conflit', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('ignore les valeurs falsy', () => {
    expect(cn('px-2', null, undefined, false, 'py-1')).toBe('px-2 py-1')
  })

  it('gère les tableaux imbriqués', () => {
    expect(cn(['px-2', 'py-1'], 'bg-red-500')).toBe('px-2 py-1 bg-red-500')
  })

  it('résout les conflits Tailwind (dernier gagne)', () => {
    expect(cn('text-sm text-red-500', 'text-blue-500')).toBe('text-sm text-blue-500')
  })
})

describe('formatDate', () => {
  it('formate une date ISO en français', () => {
    const result = formatDate('2024-03-15T14:30:00Z')
    expect(result).toMatch(/15\/03/)
    expect(result).toMatch(/15:30/)
  })

  it('retourne "—" pour une valeur null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('retourne "—" pour une valeur undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('gère le fuseau horaire Europe/Paris', () => {
    // 14:00 UTC = 15:00 CET (hiver) ou 16:00 CEST (été)
    const result = formatDate('2024-01-15T14:00:00Z')
    expect(result).toMatch(/15\/01/)
    // Heure doit être 15:00 en janvier (CET)
    expect(result).toMatch(/15:00/)
  })
})

describe('formatRelative', () => {
  it('retourne "à l\'instant" pour une date récente', () => {
    const now = new Date().toISOString()
    expect(formatRelative(now)).toBe("à l'instant")
  })

  it('retourne "il y a X min" pour une date de quelques minutes', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(formatRelative(fiveMinutesAgo)).toBe('il y a 5 min')
  })

  it('retourne "il y a Xh" pour une date de quelques heures', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    expect(formatRelative(threeHoursAgo)).toBe('il y a 3h')
  })

  it('retourne "il y a Xj" pour une date de plusieurs jours', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelative(twoDaysAgo)).toBe('il y a 2j')
  })

  it('retourne "—" pour une valeur null', () => {
    expect(formatRelative(null)).toBe('—')
  })
})
