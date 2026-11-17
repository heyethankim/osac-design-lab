import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Icon,
  MenuToggle,
} from '@patternfly/react-core'
import { RhStandardOfficeIcon } from '@patternfly/react-icons/dist/esm/icons/rh-standard-office-icon'
import { getOrganizationDisplayName } from '../../billing/m360'
import { isDemoTenantId, type DemoTenantId } from '../../demoTenant'
import {
  isNorthSummitBankOrganization,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'
import {
  ensureProviderDemoOrganizations,
  getProviderRegisteredOrganizations,
} from '../../providerSetup/storage'
import {
  buildProviderTenantContextSwitcherPath,
  buildTenantAdminCatalogPath,
} from '../../shared/workspaceNavUrl'

const PROVIDER_ADMIN_CONTEXT_VALUE = '__provider-admin__'

/** Resolve a registered org to a demo tenant workspace slug, if one exists. */
export function resolveTenantContextWorkspaceSlug(
  organization: Pick<RegisteredOrganization, 'slug' | 'name'>,
): DemoTenantId | null {
  const slug = organization.slug.trim().toLowerCase()
  if (isDemoTenantId(slug)) {
    return slug
  }
  if (isNorthSummitBankOrganization(organization)) {
    return 'northsummit'
  }
  if (
    slug === 'bluesolace' ||
    slug === 'bluesolace-financial-group' ||
    organization.name.trim().toLowerCase().includes('bluesolace')
  ) {
    return 'evergreen'
  }
  return null
}

function listSwitchableTenants(): {
  organization: RegisteredOrganization
  workspaceSlug: DemoTenantId
}[] {
  ensureProviderDemoOrganizations()
  const seen = new Set<DemoTenantId>()
  const entries: {
    organization: RegisteredOrganization
    workspaceSlug: DemoTenantId
  }[] = []
  for (const organization of getProviderRegisteredOrganizations()) {
    const workspaceSlug = resolveTenantContextWorkspaceSlug(organization)
    if (!workspaceSlug || seen.has(workspaceSlug)) {
      continue
    }
    seen.add(workspaceSlug)
    entries.push({ organization, workspaceSlug })
  }
  return entries
}

type TenantContextSwitcherProps = {
  topicId: string
  /** When set, the control is in a tenant workspace and can return to Provider Admin. */
  activeTenantSlug?: string
  id?: string
}

/**
 * Masthead context switcher for the tenant-context-switcher Design Lab topic.
 * Provider Admin: pick a tenant to enter. Tenant Admin: stay on a tenant or exit
 * back to Provider Admin.
 */
export function TenantContextSwitcher({
  topicId,
  activeTenantSlug,
  id = 'tenant-context-switcher',
}: TenantContextSwitcherProps) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const tenants = useMemo(() => listSwitchableTenants(), [])
  const activeTenant = activeTenantSlug
    ? tenants.find((entry) => entry.workspaceSlug === activeTenantSlug)
    : undefined
  const toggleLabel = activeTenant
    ? getOrganizationDisplayName(activeTenant.organization)
    : 'Switch to tenant'
  const ariaLabel = activeTenant
    ? `Tenant context: ${toggleLabel}. Switch tenant or return to Provider Admin`
    : 'Switch to tenant'

  return (
    <div className="tenant-context-switcher pill-filter-select pill-filter-select--organization">
      <Dropdown
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        onSelect={(_event, value) => {
          if (value == null) {
            return
          }
          const next = String(value)
          setIsOpen(false)
          if (next === PROVIDER_ADMIN_CONTEXT_VALUE) {
            navigate(
              buildProviderTenantContextSwitcherPath({
                topic: topicId,
                design: '2',
              }),
            )
            return
          }
          if (next === activeTenantSlug) {
            return
          }
          navigate(
            buildTenantAdminCatalogPath({
              tenant: next,
              topic: topicId,
              design: '2',
            }),
          )
        }}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            id={id}
            isExpanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            aria-label={ariaLabel}
            className="bmaas-dropdown-toggle tenant-context-switcher__toggle pill-filter-select__toggle"
            icon={
              <Icon
                size="md"
                className="tenant-context-switcher__icon"
              >
                <RhStandardOfficeIcon aria-hidden />
              </Icon>
            }
          >
            {activeTenant ? `Tenant: ${toggleLabel}` : toggleLabel}
          </MenuToggle>
        )}
      >
        <DropdownList>
          {activeTenantSlug ? (
            <>
              <DropdownItem
                value={PROVIDER_ADMIN_CONTEXT_VALUE}
                description="Back to provider workspace"
              >
                Provider Admin
              </DropdownItem>
              <Divider component="li" />
            </>
          ) : null}
          {tenants.length === 0 ? (
            <DropdownItem isDisabled>No tenants available</DropdownItem>
          ) : (
            tenants.map(({ organization, workspaceSlug }) => (
              <DropdownItem
                key={organization.id}
                value={workspaceSlug}
                isSelected={workspaceSlug === activeTenantSlug}
              >
                {getOrganizationDisplayName(organization)}
              </DropdownItem>
            ))
          )}
        </DropdownList>
      </Dropdown>
    </div>
  )
}
