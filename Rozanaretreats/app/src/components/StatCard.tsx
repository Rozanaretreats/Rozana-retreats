interface StatCardProps {
  label: string
  value: number | string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
}

const tones = {
  default: 'border-sand-dark bg-white text-forest',
  success: 'border-green-200 bg-green-50 text-green-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-800',
  muted: 'border-sand-dark bg-sand text-forest/70',
}

export function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  return (
    <div className={`rounded-xl border-2 px-3 py-3 md:rounded-2xl md:px-5 md:py-4 ${tones[tone]}`}>
      <p className="text-2xl font-bold tabular-nums md:text-3xl">{value}</p>
      <p className="mt-0.5 text-xs font-medium md:mt-1 md:text-sm">{label}</p>
    </div>
  )
}
