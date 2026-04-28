import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option { label: string; value: string }

interface ResourceSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  loading?: boolean
  disabled?: boolean
  notConnectedMsg?: string
}

export function ResourceSelect({ options, value, onChange, placeholder, loading, disabled, notConnectedMsg }: ResourceSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const selected = options.find(o => o.value === value)

  if (notConnectedMsg) {
    return (
      <div className="flex h-9 w-full items-center rounded-md border border-dashed border-input bg-transparent px-3 text-xs text-muted-foreground">
        {notConnectedMsg}
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => { setOpen(v => !v); setSearch('') }}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !selected && 'text-muted-foreground'
        )}
      >
        <span className="truncate">{selected ? selected.label : (placeholder ?? 'Sélectionner...')}</span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {value && !loading && (
            <X
              className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
              onClick={e => { e.stopPropagation(); onChange('') }}
            />
          )}
          {!value && !loading && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {open && !loading && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="flex items-center border-b px-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="flex h-8 w-full bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Aucun résultat</p>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    'flex w-full items-center px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-left',
                    opt.value === value && 'bg-accent/50 font-medium'
                  )}
                  onClick={() => { onChange(opt.value); setOpen(false); setSearch('') }}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
