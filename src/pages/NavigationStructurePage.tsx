import { useState } from 'react'
import { PersonaNavColumn } from '../navCompare/PersonaNavColumn'
import { personasInOrder, type PersonaId } from '../navCompare/navData'

export function NavigationStructurePage() {
  const [tipOwnerId, setTipOwnerId] = useState<PersonaId | null>(null)

  return (
    <div className="nav-compare">
      <header className="nav-compare__header">
        <h1 className="nav-compare__title">Navigation structure by persona</h1>
      </header>

      <div className="nav-compare__columns">
        {personasInOrder.map((persona) => (
          <PersonaNavColumn
            key={persona.id}
            config={persona}
            tipActive={tipOwnerId === persona.id}
            onActivate={() => setTipOwnerId(persona.id)}
          />
        ))}
      </div>
    </div>
  )
}
