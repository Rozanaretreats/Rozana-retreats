import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export const formInputClass =
  'w-full rounded-xl border border-sand-dark bg-sand px-4 py-3 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/10'

type FormSelectOption = string | { value: string; label: string }

function normalizeOptions(options: readonly FormSelectOption[]) {
  return options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
}

type MenuPosition = {
  top: number
  left: number
  width: number
  maxHeight: number
}

const MENU_MAX_HEIGHT = 240

function measureMenu(button: HTMLButtonElement): MenuPosition {
  const rect = button.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom - 8
  const spaceAbove = rect.top - 8
  const openUp = spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow
  const available = openUp ? spaceAbove : spaceBelow
  const maxHeight = Math.min(MENU_MAX_HEIGHT, Math.max(available, 120))

  if (openUp) {
    return {
      left: rect.left,
      width: rect.width,
      maxHeight,
      top: Math.max(8, rect.top - maxHeight - 4),
    }
  }

  return {
    left: rect.left,
    width: rect.width,
    maxHeight,
    top: rect.bottom + 4,
  }
}

type FormSelectProps = {
  value: string
  onChange: (value: string) => void
  options: readonly FormSelectOption[]
  label?: string
  placeholder?: string
  className?: string
}

export function FormSelect({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select…',
  className,
}: FormSelectProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const items = normalizeOptions(options)

  const updateMenuPosition = () => {
    if (!buttonRef.current) return
    setMenuPos(measureMenu(buttonRef.current))
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null)
      return
    }
    updateMenuPosition()
  }, [open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScrollOrResize = () => updateMenuPosition()

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [open])

  const display = items.find((o) => o.value === value)?.label ?? placeholder

  const menu =
    open && menuPos
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
              zIndex: 9999,
            }}
            className="overflow-y-auto overscroll-contain rounded-xl border border-forest/15 bg-white py-1 shadow-xl ring-1 ring-forest/10"
          >
            {items.map((option) => {
              const selected = option.value === value
              return (
                <li key={option.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={[
                      'flex min-h-11 w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors',
                      selected
                        ? 'bg-forest text-white'
                        : 'text-forest/80 active:bg-green-50 hover:bg-green-50 hover:text-forest',
                    ].join(' ')}
                  >
                    <span>{option.label}</span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-white" />}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className={className}>
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-forest/60">{label}</span>
      )}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={[
          formInputClass,
          'flex w-full items-center justify-between gap-2 text-left',
          open ? 'border-forest ring-2 ring-forest/10' : '',
        ].join(' ')}
      >
        <span className={value ? 'text-forest' : 'text-forest/45'}>{display}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-forest/45 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </div>
  )
}
