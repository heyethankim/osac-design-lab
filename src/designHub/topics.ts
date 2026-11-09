import {
  buildNavigationStructurePath,
  buildProviderCreateCatalogItemPath,
  buildProviderOrganizationsPath,
  buildTenantAdminServiceAccountsPath,
  NAVIGATION_STRUCTURE_TOPIC_ID,
  WORKSPACE_DESIGN_MULTI_SERVICE,
  WORKSPACE_DESIGN_PARAM,
  WORKSPACE_DESIGN_VM_NO_SERVICE,
  WORKSPACE_WIDTH_FULL,
  WORKSPACE_WIDTH_MAX,
  WORKSPACE_WIDTH_PARAM,
} from '../shared/workspaceNavUrl'

export const TOPIC_CATALOG_ITEM_CREATION = 'catalog-item-creation'
export const TOPIC_FULL_VS_MAX_WIDTH = 'full-vs-max-width'
export const TOPIC_NAVIGATION_STRUCTURE = NAVIGATION_STRUCTURE_TOPIC_ID
export const TOPIC_SERVICE_ACCOUNTS = 'service-accounts'
export const TOPIC_EXTERNAL_BILLING_ID = 'external-billing-id'

export type DesignHubOption = {
  key: string
  label: string
  to?: string
  href?: string
  isCurrent: (pathname: string, searchParams: URLSearchParams) => boolean
}

function designParamIs(searchParams: URLSearchParams, value: string): boolean {
  return searchParams.get(WORKSPACE_DESIGN_PARAM)?.trim() === value
}

function widthParamIs(searchParams: URLSearchParams, value: string): boolean {
  return searchParams.get(WORKSPACE_WIDTH_PARAM)?.trim() === value
}

/** Design options available in the hub banner for a topic (when opened with hub=1). */
export const DESIGN_HUB_TOPIC_OPTIONS: Record<string, readonly DesignHubOption[]> = {
  [TOPIC_EXTERNAL_BILLING_ID]: [
    { key: '1', label: 'Design 1', isCurrent: (_p, s) => designParamIs(s, '1') },
    { key: '2', label: 'Design 2', isCurrent: (_p, s) => designParamIs(s, '2') },
    {
      key: '3',
      label: 'Design 3',
      to: buildProviderOrganizationsPath({ topic: TOPIC_EXTERNAL_BILLING_ID, design: '3' }),
      isCurrent: (_p, s) => designParamIs(s, '3') || !s.get(WORKSPACE_DESIGN_PARAM),
    },
  ],
  [TOPIC_SERVICE_ACCOUNTS]: [
    { key: '1', label: 'Design 1', isCurrent: (_p, s) => designParamIs(s, '1') },
    { key: '2', label: 'Design 2', isCurrent: (_p, s) => designParamIs(s, '2') },
    {
      key: '3',
      label: 'Design 3',
      to: buildTenantAdminServiceAccountsPath({ topic: TOPIC_SERVICE_ACCOUNTS, design: '3' }),
      isCurrent: (_p, s) => designParamIs(s, '3') || !s.get(WORKSPACE_DESIGN_PARAM),
    },
  ],
  [TOPIC_NAVIGATION_STRUCTURE]: [
    {
      key: '1',
      label: 'Design',
      to: buildNavigationStructurePath(TOPIC_NAVIGATION_STRUCTURE),
      isCurrent: () => true,
    },
  ],
  [TOPIC_CATALOG_ITEM_CREATION]: [
    {
      key: WORKSPACE_DESIGN_VM_NO_SERVICE,
      label: 'Design 1',
      to: buildProviderCreateCatalogItemPath({
        design: WORKSPACE_DESIGN_VM_NO_SERVICE,
        service: 'virtual-machine',
        topic: TOPIC_CATALOG_ITEM_CREATION,
      }),
      isCurrent: (_p, s) => designParamIs(s, WORKSPACE_DESIGN_VM_NO_SERVICE),
    },
    {
      key: WORKSPACE_DESIGN_MULTI_SERVICE,
      label: 'Design 2',
      to: buildProviderCreateCatalogItemPath({
        design: WORKSPACE_DESIGN_MULTI_SERVICE,
        topic: TOPIC_CATALOG_ITEM_CREATION,
      }),
      isCurrent: (_p, s) => designParamIs(s, WORKSPACE_DESIGN_MULTI_SERVICE),
    },
    {
      key: '3',
      label: 'Design 3',
      isCurrent: (_p, s) => designParamIs(s, '3'),
    },
  ],
  [TOPIC_FULL_VS_MAX_WIDTH]: [
    {
      key: '1',
      label: 'Design 1',
      to: buildProviderCreateCatalogItemPath({
        width: WORKSPACE_WIDTH_FULL,
        service: 'baremetal',
        step: 'hardware',
        topic: TOPIC_FULL_VS_MAX_WIDTH,
      }),
      isCurrent: (_p, s) => widthParamIs(s, WORKSPACE_WIDTH_FULL),
    },
    {
      key: '2',
      label: 'Design 2',
      to: buildProviderCreateCatalogItemPath({
        width: WORKSPACE_WIDTH_MAX,
        service: 'baremetal',
        step: 'hardware',
        topic: TOPIC_FULL_VS_MAX_WIDTH,
      }),
      isCurrent: (_p, s) => widthParamIs(s, WORKSPACE_WIDTH_MAX),
    },
  ],
}

export function getDesignHubTopicOptions(topicId: string | null | undefined): readonly DesignHubOption[] {
  if (!topicId) {
    return []
  }
  return DESIGN_HUB_TOPIC_OPTIONS[topicId] ?? []
}
