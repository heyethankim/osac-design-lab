import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PersonaNavColumn } from '../navCompare/PersonaNavColumn'
import { personasForNavDesign, type PersonaId } from '../navCompare/navData'
import { WORKSPACE_DESIGN_PARAM } from '../shared/workspaceNavUrl'

function getNavDesign(searchParams: URLSearchParams): '1' | '2' {
  return searchParams.get(WORKSPACE_DESIGN_PARAM)?.trim() === '2' ? '2' : '1'
}

export function NavigationStructurePage() {
  const [searchParams] = useSearchParams()
  const design = getNavDesign(searchParams)
  const personas = useMemo(() => personasForNavDesign(design), [design])
  const [tipOwnerId, setTipOwnerId] = useState<PersonaId | null>(null)

  return (
    <div className="nav-compare">
      <header className="nav-compare__header">
        <h1 className="nav-compare__title">Navigation structure by persona</h1>
      </header>

      <div className="nav-compare__columns">
        {personas.map((persona) => (
          <PersonaNavColumn
            key={`${design}-${persona.id}`}
            config={persona}
            tipActive={tipOwnerId === persona.id}
            onActivate={() => setTipOwnerId(persona.id)}
          />
        ))}
      </div>
    </div>
  )
}
