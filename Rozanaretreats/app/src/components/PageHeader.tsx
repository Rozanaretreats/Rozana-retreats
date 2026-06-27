interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3 md:mb-8 md:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-forest md:text-2xl">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-forest/60 md:max-w-xl">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  )
}
