import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { formInputClass } from './FormSelect'
import { todayIso } from '../lib/dates'

type MenuPosition = {
  top: number
  left: number
  width: number
}

function measureMenu(button: HTMLButtonElement): MenuPosition {
  const rect = button.getBoundingClientRect()
  const width = Math.max(rect.width, 280)
  const left = Math.min(rect.left, window.innerWidth - width - 8)
  return { top: rect.bottom + 4, left: Math.max(8, left), width }
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function toLocalIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDisplay(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}-${m}-${y}`
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

function buildCalendarDays(year: number, month: number): { iso: string; inMonth: boolean }[] {
  const first = new Date(year, month, 1)
  const startOffset = first.getDay()
  const cells: { iso: string; inMonth: boolean }[] = []

  const start = new Date(year, month, 1 - startOffset)
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({
      iso: toLocalIso(d),
      inMonth: d.getMonth() === month,
    })
  }
  return cells
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const

type FormDateInputProps = {
  value: string
  onChange: (value: string) => void
  label?: string
  min?: string
  max?: string
  className?: string
}

export function FormDateInput({
  value,
  onChange,
  label,
  min,
  max,
  className,
}: FormDateInputProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null)
  const parsed = parseIso(value)
  const [viewYear, setViewYear] = useState(parsed.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed.getMonth())

  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const updateMenuPosition = () => {
    if (!buttonRef.current) return
    setMenuPos(measureMenu(buttonRef.current))
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null)
      return
    }
    const p = parseIso(value)
    setViewYear(p.getFullYear())
    setViewMonth(p.getMonth())
    updateMenuPosition()
  }, [open, value])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
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

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const isDisabled = (iso: string) => {
    if (min && iso < min) return true
    if (max && iso > max) return true
    return false
  }

  const pickDay = (iso: string) => {
    if (isDisabled(iso)) return
    onChange(iso)
    setOpen(false)
  }

  const days = buildCalendarDays(viewYear, viewMonth)
  const today = todayIso()

  const panel =
    open && menuPos
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="Choose date"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 9999,
            }}
            className="rounded-xl border border-forest/15 bg-white p-3 shadow-xl ring-1 ring-forest/10"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-forest/70 hover:bg-green-50 hover:text-forest"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-forest">{monthLabel(viewYear, viewMonth)}</p>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-forest/70 hover:bg-green-50 hover:text-forest"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((d) => (
                <span
                  key={d}
                  className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-forest/45"
                >
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const selected = day.iso === value
                const disabled = isDisabled(day.iso)
                const isToday = day.iso === today
                return (
                  <button
                    key={day.iso}
                    type="button"
                    disabled={disabled}
                    onClick={() => pickDay(day.iso)}
                    className={[
                      'flex h-9 w-full items-center justify-center rounded-lg text-sm transition-colors',
                      selected
                        ? 'bg-forest font-semibold text-white'
                        : disabled
                          ? 'cursor-not-allowed text-forest/25'
                          : day.inMonth
                            ? 'text-forest hover:bg-green-50'
                            : 'text-forest/35 hover:bg-sand/80',
                      isToday && !selected ? 'ring-1 ring-forest/25' : '',
                    ].join(' ')}
                  >
                    {parseIso(day.iso).getDate()}
                  </button>
                )
              })}
            </div>

            <div className="mt-2 flex justify-end border-t border-sand-dark pt-2">
              <button
                type="button"
                onClick={() => pickDay(today)}
                disabled={isDisabled(today)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-forest hover:bg-green-50 disabled:text-forest/35"
              >
                Today
              </button>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className={className}>
      {label && (
        <span className="mb-1 block text-xs font-medium text-forest/55">{label}</span>
      )}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={[
          formInputClass,
          'flex w-full items-center justify-between gap-2 text-left',
          open ? 'border-forest ring-2 ring-forest/10' : '',
        ].join(' ')}
      >
        <span className="text-forest">{formatDisplay(value)}</span>
        <Calendar className="h-4 w-4 shrink-0 text-forest/45" />
      </button>
      {panel}
    </div>
  )
}
