interface Tab<T extends string> {

  id: T

  label: string

  count?: number

}



interface TabGroupProps<T extends string> {

  tabs: Tab<T>[]

  active: T

  onChange: (id: T) => void

}



export function TabGroup<T extends string>({ tabs, active, onChange }: TabGroupProps<T>) {

  const useMobileGrid = tabs.length >= 4



  return (

    <div

      className={[

        useMobileGrid ? 'grid grid-cols-2 gap-1 md:flex' : 'flex',

        'rounded-xl bg-sand-dark p-1',

      ].join(' ')}

    >

      {tabs.map((tab) => (

        <button

          key={tab.id}

          type="button"

          onClick={() => onChange(tab.id)}

          className={[

            'flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors sm:gap-2 sm:py-2.5 sm:text-sm',

            useMobileGrid ? 'md:flex-1' : 'flex-1',

            active === tab.id ? 'bg-white text-forest shadow-sm' : 'text-forest/60 hover:text-forest',

          ].join(' ')}

        >

          <span className="truncate">{tab.label}</span>

          {tab.count !== undefined && (

            <span

              className={[

                'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums sm:px-2 sm:text-xs',

                active === tab.id ? 'bg-forest/10 text-forest' : 'bg-white/60 text-forest/50',

              ].join(' ')}

            >

              {tab.count}

            </span>

          )}

        </button>

      ))}

    </div>

  )

}


