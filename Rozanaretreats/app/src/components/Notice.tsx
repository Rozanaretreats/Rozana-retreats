import { CheckCircle2, AlertCircle, X } from 'lucide-react'

interface NoticeProps {
  tone?: 'success' | 'error'
  message: string
  onDismiss?: () => void
}

const styles = {
  success: 'border-green-200 bg-green-50 text-green-900',
  error: 'border-red-200 bg-red-50 text-red-900',
}

export function Notice({ tone = 'success', message, onDismiss }: NoticeProps) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle
  return (
    <div className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${styles[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
