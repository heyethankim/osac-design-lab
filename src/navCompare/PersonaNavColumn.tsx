import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Divider, Nav, NavExpandable, NavItem, NavList } from '@patternfly/react-core'
import { BarsIcon } from '@patternfly/react-icons/dist/esm/icons/bars-icon'
import redHatHatLogoUrl from '../assets/Logo-RedHat-Hat-Color-RGB.svg?url'
import { NorthsummitBankMastheadLogo } from '../components/tenant/NorthsummitBankMastheadLogo'
import type { PersonaNavConfig } from './navData'

function usesNorthSummitBrand(personaId: PersonaNavConfig['id']): boolean {
  return personaId === 'tenant-admin' || personaId === 'tenant-user'
}

type PersonaNavColumnProps = {
  config: PersonaNavConfig
  /** Only the active persona column may show a tooltip */
  tipActive: boolean
  onActivate: () => void
}

type TipState = {
  text: string
  top: number
  left: number
}

function findDescription(config: PersonaNavConfig, activeItem: string): string | null {
  for (const row of config.nav) {
    if (row.kind === 'link' && row.id === activeItem && row.description) {
      return row.description
    }
    if (row.kind === 'expand') {
      const child = row.children.find((c) => c.id === activeItem && c.description)
      if (child?.description) return child.description
    }
  }
  return null
}

export function PersonaNavColumn({ config, tipActive, onActivate }: PersonaNavColumnProps) {
  const [activeItem, setActiveItem] = useState(config.activeItem)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(config.defaultExpanded.map((id) => [id, true])),
  )
  const [tip, setTip] = useState<TipState | null>(null)
  const hostRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

  const description = tipActive ? findDescription(config, activeItem) : null

  useLayoutEffect(() => {
    if (!description) {
      setTip(null)
      return
    }

    const update = () => {
      const host = hostRefs.current.get(activeItem)
      if (!host) {
        setTip(null)
        return
      }
      const rect = host.getBoundingClientRect()
      setTip({
        text: description,
        top: rect.bottom + 12,
        left: rect.left + rect.width / 2 + 48,
      })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [activeItem, description])

  const onNavSelect = (
    _event: FormEvent<HTMLInputElement>,
    result: { itemId: number | string },
  ) => {
    onActivate()
    setActiveItem(String(result.itemId))
  }

  const onNavToggle = (
    _event: ReactMouseEvent<HTMLButtonElement>,
    result: { groupId: number | string; isExpanded: boolean },
  ) => {
    setExpanded((prev) => ({
      ...prev,
      [String(result.groupId)]: result.isExpanded,
    }))
  }

  const setHostRef = (id: string, node: HTMLDivElement | null) => {
    hostRefs.current.set(id, node)
  }

  return (
    <section className="nav-compare__column" aria-label={config.label}>
      <div className="nav-compare__persona">{config.label}</div>
      <div className="nav-compare__shell">
        <header className="nav-compare__masthead">
          <span className="nav-compare__toggle" aria-hidden>
            <BarsIcon />
          </span>
          {usesNorthSummitBrand(config.id) ? (
            <div className="nav-compare__brand nav-compare__brand--northsummit">
              <NorthsummitBankMastheadLogo />
            </div>
          ) : (
            <div className="nav-compare__brand nav-compare__brand--redhat" aria-label="Red Hat">
              <img
                className="nav-compare__brand-logo"
                src={redHatHatLogoUrl}
                alt=""
                draggable={false}
              />
              <span className="nav-compare__brand-wordmark">Red Hat</span>
            </div>
          )}
        </header>

        <div className="nav-compare__sidebar">
          <div className="osac-shell-sidebar-product nav-compare__product">
            <p className="osac-shell-sidebar-product__title">Cloud Extensions</p>
            <Divider className="osac-shell-sidebar-product__divider" />
          </div>
          <Nav
            onSelect={onNavSelect}
            onToggle={onNavToggle}
            aria-label={`${config.label} primary`}
          >
            <NavList>
              {config.nav.map((row) => {
                if (row.kind === 'link') {
                  return (
                    <div
                      key={row.id}
                      className="nav-compare__nav-host"
                      ref={(node) => setHostRef(row.id, node)}
                    >
                      <NavItem
                        preventDefault
                        to={`#${config.id}-${row.id}`}
                        itemId={row.id}
                        isActive={activeItem === row.id}
                      >
                        {row.label}
                      </NavItem>
                    </div>
                  )
                }

                const childIds = row.children.map((c) => c.id)
                const isGroupActive = childIds.includes(activeItem)

                return (
                  <NavExpandable
                    key={row.groupId}
                    title={row.label}
                    groupId={row.groupId}
                    isActive={isGroupActive}
                    isExpanded={expanded[row.groupId] ?? false}
                  >
                    {row.children.map((child) => (
                      <div
                        key={child.id}
                        className="nav-compare__nav-host"
                        ref={(node) => setHostRef(child.id, node)}
                      >
                        <NavItem
                          preventDefault
                          to={`#${config.id}-${child.id}`}
                          groupId={row.groupId}
                          itemId={child.id}
                          isActive={activeItem === child.id}
                        >
                          {child.label}
                        </NavItem>
                      </div>
                    ))}
                  </NavExpandable>
                )
              })}
            </NavList>
          </Nav>
        </div>
      </div>

      {tip
        ? createPortal(
            <aside
              className="nav-compare__tip"
              role="tooltip"
              aria-live="polite"
              style={{ top: tip.top, left: tip.left }}
            >
              {tip.text}
            </aside>,
            document.body,
          )
        : null}
    </section>
  )
}
