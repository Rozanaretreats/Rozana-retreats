import { useProperty, type PropertyFilter } from '../context/PropertyContext'

import { properties } from '../data/properties'



const options: { value: PropertyFilter; label: string }[] = [

  { value: 'all', label: 'Both properties' },

  ...properties.map((p) => ({ value: p.id as PropertyFilter, label: p.shortName })),

]



type PropertyToggleProps = {

  layout?: 'inline' | 'stacked'

}



export function PropertyToggle({ layout = 'inline' }: PropertyToggleProps) {

  const { filter, setFilter, canToggle } = useProperty()



  if (!canToggle) return null



  if (layout === 'stacked') {

    return (

      <div className="flex flex-col gap-2">

        {options.map((opt) => (

          <button

            key={opt.value}

            type="button"

            onClick={() => setFilter(opt.value)}

            className={[

              'min-h-12 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors',

              filter === opt.value

                ? 'bg-forest text-white shadow-sm'

                : 'bg-sand text-forest/70 ring-1 ring-sand-dark active:bg-white',

            ].join(' ')}

          >

            {opt.label}

          </button>

        ))}

      </div>

    )

  }



  return (

    <div className="flex max-w-[min(100%,20rem)] flex-wrap justify-end gap-1.5 sm:max-w-none sm:gap-2">

      {options.map((opt) => (

        <button

          key={opt.value}

          type="button"

          onClick={() => setFilter(opt.value)}

          className={[

            'rounded-full px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm',

            filter === opt.value

              ? 'bg-forest text-white shadow-sm'

              : 'bg-white text-forest/70 ring-1 ring-sand-dark hover:bg-sand',

          ].join(' ')}

        >

          {opt.label}

        </button>

      ))}

    </div>

  )

}


