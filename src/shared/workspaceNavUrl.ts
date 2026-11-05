import type { NavigateOptions, SetURLSearchParams } from 'react-router-dom'

/** Query key for an open catalog item detail page (display name or catalog item id). */
export const WORKSPACE_CATALOG_ITEM_PARAM = 'item'

/** Query key for an open service instance detail page (instance name or id). */
export const WORKSPACE_INSTANCE_PARAM = 'instance'

/** Query key for an open tenant detail page on Administration → Tenants. */
export const WORKSPACE_ORGANIZATION_PARAM = 'tenant'

/** Query key for a workspace create/register wizard flow. */
export const WORKSPACE_ACTION_PARAM = 'action'

/** Query key for wizard content width comparison (`max` vs `full`). */
export const WORKSPACE_WIDTH_PARAM = 'width'

/** Query key for deep-linking a create-catalog wizard step (step id, e.g. `hardware`). */
export const WORKSPACE_STEP_PARAM = 'step'

/** Query key for deep-linking a create-catalog service (`baremetal`, `cluster`, …). */
export const WORKSPACE_SERVICE_PARAM = 'service'

/**
 * Query key for catalog-item creation design variants.
 * `1` = VM wizard without Service step; `2` = multi-service wizard with Service.
 */
export const WORKSPACE_DESIGN_PARAM = 'design'
export const WORKSPACE_DESIGN_VM_NO_SERVICE = '1'
export const WORKSPACE_DESIGN_MULTI_SERVICE = '2'

/** Query key marking a page opened from the design-topics landing (`hub=1`). */
export const WORKSPACE_HUB_PARAM = 'hub'
export const WORKSPACE_HUB_VALUE = '1'

/** Query key for the landing topic id when opened from a design link. */
export const WORKSPACE_TOPIC_PARAM = 'topic'

/** Landing query key to soft-highlight a topic card after “Back to home”. */
export const LANDING_FOCUS_TOPIC_PARAM = 'focus'

export const WORKSPACE_ACTION_CREATE_CATALOG_ITEM = 'create-catalog-item'
export const WORKSPACE_ACTION_REGISTER_TENANT = 'register-tenant'

export const WORKSPACE_WIDTH_MAX = 'max'
export const WORKSPACE_WIDTH_FULL = 'full'

export type WorkspaceAction =
  | typeof WORKSPACE_ACTION_CREATE_CATALOG_ITEM
  | typeof WORKSPACE_ACTION_REGISTER_TENANT

export type WorkspaceWidthMode = typeof WORKSPACE_WIDTH_MAX | typeof WORKSPACE_WIDTH_FULL

export type CatalogCreateDesignId =
  | typeof WORKSPACE_DESIGN_VM_NO_SERVICE
  | typeof WORKSPACE_DESIGN_MULTI_SERVICE

export function getWorkspaceDesignParam(
  searchParams: URLSearchParams,
): CatalogCreateDesignId | null {
  const value = searchParams.get(WORKSPACE_DESIGN_PARAM)?.trim()
  if (value === WORKSPACE_DESIGN_VM_NO_SERVICE || value === WORKSPACE_DESIGN_MULTI_SERVICE) {
    return value
  }
  return null
}

export type SyncWorkspaceNavOptions = NavigateOptions & {
  /**
   * Left-nav landing navigation: always clear `?item=` so re-selecting Catalog
   * (or any section) returns to the list view instead of keeping a detail open.
   */
  showLanding?: boolean
}

function isWorkspaceAction(value: string | null | undefined): value is WorkspaceAction {
  return (
    value === WORKSPACE_ACTION_CREATE_CATALOG_ITEM || value === WORKSPACE_ACTION_REGISTER_TENANT
  )
}

export function getWorkspaceCatalogItemParam(searchParams: URLSearchParams): string | null {
  const value = searchParams.get(WORKSPACE_CATALOG_ITEM_PARAM)?.trim()
  return value || null
}

export function getWorkspaceOrganizationParam(searchParams: URLSearchParams): string | null {
  const value = searchParams.get(WORKSPACE_ORGANIZATION_PARAM)?.trim()
  return value || null
}

export function getWorkspaceInstanceParam(searchParams: URLSearchParams): string | null {
  const value = searchParams.get(WORKSPACE_INSTANCE_PARAM)?.trim()
  return value || null
}

export function getWorkspaceActionParam(searchParams: URLSearchParams): WorkspaceAction | null {
  const value = searchParams.get(WORKSPACE_ACTION_PARAM)?.trim()
  return isWorkspaceAction(value) ? value : null
}

export function getWorkspaceWidthParam(searchParams: URLSearchParams): WorkspaceWidthMode | null {
  const value = searchParams.get(WORKSPACE_WIDTH_PARAM)?.trim()
  if (value === WORKSPACE_WIDTH_MAX || value === WORKSPACE_WIDTH_FULL) {
    return value
  }
  return null
}

export function getWorkspaceStepParam(searchParams: URLSearchParams): string | null {
  const value = searchParams.get(WORKSPACE_STEP_PARAM)?.trim()
  return value || null
}

export function getWorkspaceServiceParam(searchParams: URLSearchParams): string | null {
  const value = searchParams.get(WORKSPACE_SERVICE_PARAM)?.trim()
  return value || null
}

export function getWorkspaceHubParam(searchParams: URLSearchParams): boolean {
  return searchParams.get(WORKSPACE_HUB_PARAM)?.trim() === WORKSPACE_HUB_VALUE
}

export function getWorkspaceTopicParam(searchParams: URLSearchParams): string | null {
  const value = searchParams.get(WORKSPACE_TOPIC_PARAM)?.trim()
  return value || null
}

export function getLandingFocusTopicParam(searchParams: URLSearchParams): string | null {
  const value = searchParams.get(LANDING_FOCUS_TOPIC_PARAM)?.trim()
  return value || null
}

/** Append design-hub flag (and optional topic) so prototype chrome + return focus work. */
export function withDesignHubParam(path: string, topicId?: string): string {
  const [pathname, search = ''] = path.split('?')
  const params = new URLSearchParams(search)
  params.set(WORKSPACE_HUB_PARAM, WORKSPACE_HUB_VALUE)
  if (topicId) {
    params.set(WORKSPACE_TOPIC_PARAM, topicId)
  }
  const next = params.toString()
  return next ? `${pathname}?${next}` : pathname
}

export function buildDesignHubHomePath(topicId?: string | null): string {
  if (!topicId) {
    return '/'
  }
  const params = new URLSearchParams({ [LANDING_FOCUS_TOPIC_PARAM]: topicId })
  return `/?${params.toString()}`
}

/** Side-by-side navigation structure topic (Design Lab in-app migration of osac-nav). */
export const NAVIGATION_STRUCTURE_TOPIC_ID = 'navigation-structure'
export const NAVIGATION_STRUCTURE_PATH = '/design/navigation-structure'

export function buildNavigationStructurePath(topicId = NAVIGATION_STRUCTURE_TOPIC_ID): string {
  return withDesignHubParam(NAVIGATION_STRUCTURE_PATH, topicId)
}

export function isServicesWorkspaceNav(navId: string): boolean {
  return navId.startsWith('services-')
}

export function buildProviderOrganizationWorkspacePath(organizationId: string): string {
  const params = new URLSearchParams({
    nav: 'administration-organizations',
    [WORKSPACE_ORGANIZATION_PARAM]: organizationId,
  })

  return `/provider/workspace?${params.toString()}`
}

export function buildProviderCatalogItemWorkspacePath(itemKey: string): string {
  const params = new URLSearchParams({
    nav: 'catalog',
    [WORKSPACE_CATALOG_ITEM_PARAM]: itemKey.trim(),
  })

  return `/provider/workspace?${params.toString()}`
}

export function buildProviderCreateCatalogItemPath(options?: {
  width?: WorkspaceWidthMode
  service?: string
  step?: string
  topic?: string
  design?: CatalogCreateDesignId
  fromDesignHub?: boolean
}): string {
  const params = new URLSearchParams({
    nav: 'catalog',
    [WORKSPACE_ACTION_PARAM]: WORKSPACE_ACTION_CREATE_CATALOG_ITEM,
  })
  if (options?.width) {
    params.set(WORKSPACE_WIDTH_PARAM, options.width)
  }
  if (options?.service) {
    params.set(WORKSPACE_SERVICE_PARAM, options.service)
  }
  if (options?.step) {
    params.set(WORKSPACE_STEP_PARAM, options.step)
  }
  if (options?.design) {
    params.set(WORKSPACE_DESIGN_PARAM, options.design)
  }
  if (options?.fromDesignHub !== false) {
    params.set(WORKSPACE_HUB_PARAM, WORKSPACE_HUB_VALUE)
  }
  if (options?.topic) {
    params.set(WORKSPACE_TOPIC_PARAM, options.topic)
  }

  return `/provider/workspace?${params.toString()}`
}

export function buildProviderRegisterTenantPath(): string {
  const params = new URLSearchParams({
    nav: 'administration-organizations',
    [WORKSPACE_ACTION_PARAM]: WORKSPACE_ACTION_REGISTER_TENANT,
  })

  return `/provider/workspace?${params.toString()}`
}

/**
 * Keep `?nav=` in sync with the active workspace page so every view is URL-addressable.
 * Clears `?item=` when leaving Catalog, `?instance=` when leaving Services, or whenever
 * `showLanding` is set (left-nav clicks).
 */
export function syncWorkspaceNavParam(
  setSearchParams: SetURLSearchParams,
  navId: string,
  options?: SyncWorkspaceNavOptions,
): void {
  const showLanding = options?.showLanding === true
  const { showLanding: _showLanding, ...navigateOptions } = options ?? {}

  setSearchParams((current) => {
    const navMatches = current.get('nav') === navId
    const hasItem = current.has(WORKSPACE_CATALOG_ITEM_PARAM)
    const hasInstance = current.has(WORKSPACE_INSTANCE_PARAM)
    const hasTenant = current.has(WORKSPACE_ORGANIZATION_PARAM)
    const action = getWorkspaceActionParam(current)
    const shouldClearItem = showLanding || navId !== 'catalog'
    const shouldClearInstance = showLanding || !isServicesWorkspaceNav(navId)
    const shouldClearTenant = showLanding || navId !== 'administration-organizations'
    const shouldClearAction =
      showLanding ||
      (action === WORKSPACE_ACTION_CREATE_CATALOG_ITEM && navId !== 'catalog') ||
      (action === WORKSPACE_ACTION_REGISTER_TENANT && navId !== 'administration-organizations')
    const hasAction = Boolean(action)

    if (
      navMatches &&
      !(shouldClearItem && hasItem) &&
      !(shouldClearInstance && hasInstance) &&
      !(shouldClearTenant && hasTenant) &&
      !(shouldClearAction && hasAction)
    ) {
      return current
    }

    const next = new URLSearchParams(current)
    next.set('nav', navId)
    if (shouldClearItem) {
      next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
    }
    if (shouldClearInstance) {
      next.delete(WORKSPACE_INSTANCE_PARAM)
    }
    if (shouldClearTenant) {
      next.delete(WORKSPACE_ORGANIZATION_PARAM)
    }
    if (shouldClearAction) {
      next.delete(WORKSPACE_ACTION_PARAM)
    }
    return next
  }, navigateOptions)
}

/** Open or close a catalog item detail via `?item=`. */
export function syncWorkspaceCatalogItemParam(
  setSearchParams: SetURLSearchParams,
  item: string | null,
  options?: NavigateOptions,
): void {
  setSearchParams((current) => {
    const currentItem = current.get(WORKSPACE_CATALOG_ITEM_PARAM)
    if (!item) {
      if (!currentItem) {
        return current
      }
      const next = new URLSearchParams(current)
      next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
      return next
    }

    if (currentItem === item) {
      return current
    }

    const next = new URLSearchParams(current)
    next.set('nav', 'catalog')
    next.set(WORKSPACE_CATALOG_ITEM_PARAM, item)
    next.delete(WORKSPACE_ACTION_PARAM)
    return next
  }, options)
}

/** Open or close a create/register wizard via `?action=`. */
export function syncWorkspaceActionParam(
  setSearchParams: SetURLSearchParams,
  action: WorkspaceAction | null,
  options?: NavigateOptions,
): void {
  setSearchParams((current) => {
    const currentAction = getWorkspaceActionParam(current)
    if (!action) {
      if (!currentAction) {
        return current
      }
      const next = new URLSearchParams(current)
      next.delete(WORKSPACE_ACTION_PARAM)
      return next
    }

    if (currentAction === action) {
      const expectedNav =
        action === WORKSPACE_ACTION_CREATE_CATALOG_ITEM
          ? 'catalog'
          : 'administration-organizations'
      if (current.get('nav') === expectedNav) {
        return current
      }
    }

    const next = new URLSearchParams(current)
    if (action === WORKSPACE_ACTION_CREATE_CATALOG_ITEM) {
      next.set('nav', 'catalog')
      next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
    } else {
      next.set('nav', 'administration-organizations')
      next.delete(WORKSPACE_ORGANIZATION_PARAM)
    }
    next.set(WORKSPACE_ACTION_PARAM, action)
    return next
  }, options)
}

/** Open or close a service instance detail via `?instance=`. */
export function syncWorkspaceInstanceParam(
  setSearchParams: SetURLSearchParams,
  instance: string | null,
  options?: NavigateOptions,
): void {
  setSearchParams((current) => {
    const currentInstance = current.get(WORKSPACE_INSTANCE_PARAM)
    if (!instance) {
      if (!currentInstance) {
        return current
      }
      const next = new URLSearchParams(current)
      next.delete(WORKSPACE_INSTANCE_PARAM)
      return next
    }

    if (currentInstance === instance) {
      return current
    }

    const next = new URLSearchParams(current)
    next.set(WORKSPACE_INSTANCE_PARAM, instance)
    return next
  }, options)
}

/** Open or close a tenant detail page via `?tenant=` on Administration → Tenants. */
export function syncWorkspaceOrganizationParam(
  setSearchParams: SetURLSearchParams,
  organizationId: string | null,
  options?: NavigateOptions,
): void {
  setSearchParams((current) => {
    const currentOrganizationId = current.get(WORKSPACE_ORGANIZATION_PARAM)
    if (!organizationId) {
      if (!currentOrganizationId) {
        return current
      }

      const next = new URLSearchParams(current)
      next.delete(WORKSPACE_ORGANIZATION_PARAM)
      return next
    }

    if (
      current.get('nav') === 'administration-organizations' &&
      currentOrganizationId === organizationId
    ) {
      return current
    }

    const next = new URLSearchParams(current)
    next.set('nav', 'administration-organizations')
    next.set(WORKSPACE_ORGANIZATION_PARAM, organizationId)
    next.delete(WORKSPACE_ACTION_PARAM)
    return next
  }, options)
}

export function findInstanceByWorkspaceParam<
  T extends { id: string; name: string },
>(instances: readonly T[], instanceParam: string | null | undefined): T | null {
  if (!instanceParam) {
    return null
  }

  const key = instanceParam.trim().toLowerCase()
  if (!key) {
    return null
  }

  return (
    instances.find((instance) => instance.id.toLowerCase() === key) ??
    instances.find((instance) => instance.name.toLowerCase() === key) ??
    instances.find((instance) => instance.name.toLowerCase().includes(key)) ??
    null
  )
}

export function findCatalogItemByWorkspaceParam<
  T extends { catalogItemId?: string; displayName: string },
>(items: readonly T[], itemParam: string | null | undefined): T | null {
  if (!itemParam) {
    return null
  }

  const key = itemParam.trim().toLowerCase()
  if (!key) {
    return null
  }

  return (
    items.find((item) => item.catalogItemId?.toLowerCase() === key) ??
    items.find((item) => item.displayName.toLowerCase() === key) ??
    items.find((item) => item.displayName.toLowerCase().includes(key)) ??
    null
  )
}
