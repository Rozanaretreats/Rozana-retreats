import { FormDateInput } from './FormDateInput'
import {
  daysAgoIso,
  defaultMonthToDateRange,
  defaultTodayRange,
  formatPeriodLabel,
  todayIso,
} from '../lib/dates'

type DateRangeFilterProps = {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  label?: string
  className?: string
}

const presets = [
  { id: 'today', label: 'Today', range: defaultTodayRange },
  { id: 'week', label: 'Last 7 days', range: () => ({ from: daysAgoIso(6), to: todayIso() }) },
  { id: 'month', label: 'This month', range: defaultMonthToDateRange },
] as const

export function DateRangeFilter({ from, to, onChange, label, className }: DateRangeFilterProps) {
  const applyPreset = (range: () => { from: string; to: string }) => {
    const next = range()
    onChange(next.from, next.to)
  }

  const syncTo = (nextFrom: string) => {
    onChange(nextFrom, nextFrom > to ? nextFrom : to)
  }

  const syncFrom = (nextTo: string) => {
    onChange(nextTo < from ? nextTo : from, nextTo)
  }

  return (
    <div
      className={[
        'rounded-2xl border border-sand-dark bg-white px-4 py-4 shadow-sm sm:px-5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-forest">
          {label ?? 'Date range'}
          <span className="ml-2 font-normal text-forest/50">{formatPeriodLabel(from, to)}</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.range)}
              className="rounded-lg border border-sand-dark bg-sand/50 px-2.5 py-1 text-xs font-medium text-forest/70 hover:border-forest/20 hover:bg-green-50 hover:text-forest"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 sm:max-w-md">
        <FormDateInput label="From" value={from} max={to} onChange={syncTo} />
        <FormDateInput label="To" value={to} min={from} onChange={syncFrom} />
      </div>
    </div>
  )
}

export function taskFinishedInRange(
  task: { status: string; cleaningFinishedAt?: string },
  from: string,
  to: string,
): boolean {
  if (task.status !== 'done') return false
  const day = task.cleaningFinishedAt?.slice(0, 10) ?? todayIso()
  return day >= from && day <= to
}
