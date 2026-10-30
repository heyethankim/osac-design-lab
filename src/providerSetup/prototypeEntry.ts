import { createAllEditableCatalogNetworkPolicy } from '../providerAdmin/catalogNetworkPolicy'
import {
  CATALOG_ITEM_DESCRIPTIONS_BY_ID,
  DEMO_CATALOG_ITEM_IDS,
} from '../catalog/catalogItemDescriptions'
import {
  CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
  CLUSTER_NODE_SETS_DISPLAY_NAME,
  CLUSTER_NODE_SETS_RATE_CARD,
  CLUSTER_NODE_SETS_TEMPLATE_NAME,
  CLUSTER_NODE_SETS_TEMPLATE_REF_ID,
} from '../catalog/catalogSpecs'
import {
  DEFAULT_CLUSTER_CATALOG_VERSION_ID,
  DEFAULT_CLUSTER_HOST_TYPE_ID,
  DEFAULT_CLUSTER_NODE_SET_ID,
  DEFAULT_CLUSTER_TOPOLOGY_NODE_SETS,
  formatBaremetalInstanceTypeLabel,
  formatClusterHostTypeLabel,
  formatClusterNodeSetLabel,
  formatClusterPlatformLabel,
} from '../catalog/catalogPublishConfig'
import {
  clearProviderCatalogDraft,
  getProviderCatalogDraft,
  getProviderCatalogItems,
  setProviderActiveNav,
  setProviderSelectedServices,
  setProviderSetupComplete,
  ensureProviderDemoOrganizations,
  type ProviderCatalogDraft,
} from './storage'
import {
  DEFAULT_BLUEPRINT_FORM,
  DEFAULT_CATALOG_ITEM_DISPLAY_NAME,
  DEFAULT_RATE_CARD,
  GPU_BLUEPRINT_FORM,
  SECOND_CATALOG_ITEM_DISPLAY_NAME,
  parseRateCardFromForm,
} from './templateDemo'
import { DEMO_HARBORLINE_CAPITAL_TENANT_ID } from '../providerAdmin/organizations'
import type { ProviderAdminNavId } from '../providerAdmin/constants'

/** Stable demo IDs so ensure can re-seed without creating duplicates. */
export const BARE_METAL_GPU_CATALOG_ITEM_ID = 'cat-bm-gpu-training'
export const BARE_METAL_GPU_TEMPLATE_REF_ID = 'bm-dell-r750'
export const LEGACY_BARE_METAL_GPU_CATALOG_ITEM_ID = 'cat_BM_GPU_TRAINING'
export const LEGACY_BARE_METAL_GPU_TEMPLATE_REF_ID = 'bm_dell_r750'

/** Second Bare Metal offering — HPE ProLiant DL380 with A100 GPUs. */
export const BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID = 'cat-bm-dense-gpu'

const BARE_METAL_GPU_TRAINING_INSTANCE_TYPE_ID = 'large'
const BARE_METAL_AI_INFERENCE_INSTANCE_TYPE_ID = 'medium'

export const BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID = 'bm-hpe-dl380-a100'
export const LEGACY_BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID = 'cat_BM_AI_INFERENCE'
export const LEGACY_BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID = 'bm_hpe_dl380_a100'

/**
 * Demo storefront order for Provider Admin (Cluster published; Dense GPU unpublished for tenants).
 * Tenant Admin / Tenant User use the same order with unpublished items filtered out.
 */
export const DEMO_CATALOG_ITEM_ORDER = [
  BARE_METAL_GPU_CATALOG_ITEM_ID,
  BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID,
  CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
] as const

function demoCatalogItemOrderIndex(catalogItemId: string): number {
  return (DEMO_CATALOG_ITEM_ORDER as readonly string[]).indexOf(catalogItemId)
}

/**
 * Demo storefront order for known offerings.
 * Newly created items (unknown IDs) sort first by createdAt (newest first) so they
 * appear top-left; demo IDs keep their fixed relative order and never move on
 * publish/unpublish.
 */
export function sortByDemoCatalogOrder<
  T extends { catalogItemId: string; createdAt?: string },
>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftIndex = demoCatalogItemOrderIndex(left.catalogItemId)
    const rightIndex = demoCatalogItemOrderIndex(right.catalogItemId)
    const leftKnown = leftIndex !== -1
    const rightKnown = rightIndex !== -1

    // Unknown (in-session) items stay ahead of the demo set — newest first.
    if (!leftKnown && rightKnown) {
      return -1
    }
    if (leftKnown && !rightKnown) {
      return 1
    }
    if (!leftKnown && !rightKnown) {
      return (right.createdAt ?? '').localeCompare(left.createdAt ?? '')
    }

    return leftIndex - rightIndex
  })
}

/** Draft helper for Bare Metal GPU Training — used when users create catalog items. */
export function createDefaultCatalogDraft(): ProviderCatalogDraft {
  return {
    catalogItemId: BARE_METAL_GPU_CATALOG_ITEM_ID,
    templateRefId: BARE_METAL_GPU_TEMPLATE_REF_ID,
    templateName: DEFAULT_BLUEPRINT_FORM.templateName,
    displayName: DEFAULT_CATALOG_ITEM_DISPLAY_NAME,
    description: CATALOG_ITEM_DESCRIPTIONS_BY_ID[DEMO_CATALOG_ITEM_IDS.bareMetalGpuTraining],
    scope: 'global-public',
    rateCard: DEFAULT_RATE_CARD,
    serviceId: 'baremetal',
    instanceTypeId: BARE_METAL_GPU_TRAINING_INSTANCE_TYPE_ID,
    instanceTypeLabel: formatBaremetalInstanceTypeLabel(BARE_METAL_GPU_TRAINING_INSTANCE_TYPE_ID),
    osImageMode: 'editable',
    networkPolicy: createAllEditableCatalogNetworkPolicy(),
    status: 'live',
    createdAt: new Date().toISOString(),
  }
}

/** Draft helper for Dense GPU / AI Inference — used when users create catalog items. */
export function createBareMetalAiInferenceCatalogDraft(): ProviderCatalogDraft {
  const rateCard = parseRateCardFromForm(GPU_BLUEPRINT_FORM) ?? DEFAULT_RATE_CARD

  return {
    catalogItemId: BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID,
    templateRefId: BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID,
    templateName: GPU_BLUEPRINT_FORM.templateName,
    displayName: SECOND_CATALOG_ITEM_DISPLAY_NAME,
    description: CATALOG_ITEM_DESCRIPTIONS_BY_ID[DEMO_CATALOG_ITEM_IDS.bareMetalDenseGpu],
    scope: 'vip-enterprise',
    enterpriseTenantId: DEMO_HARBORLINE_CAPITAL_TENANT_ID,
    rateCard,
    serviceId: 'baremetal',
    instanceTypeId: BARE_METAL_AI_INFERENCE_INSTANCE_TYPE_ID,
    instanceTypeLabel: formatBaremetalInstanceTypeLabel(BARE_METAL_AI_INFERENCE_INSTANCE_TYPE_ID),
    networkPolicy: createAllEditableCatalogNetworkPolicy(),
    status: 'unpublished',
    createdAt: new Date().toISOString(),
  }
}

/** Draft helper for Cluster Node Sets — used when users create catalog items. */
export function createClusterNodeSetsCatalogDraft(): ProviderCatalogDraft {
  return {
    catalogItemId: CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
    templateRefId: CLUSTER_NODE_SETS_TEMPLATE_REF_ID,
    templateName: CLUSTER_NODE_SETS_TEMPLATE_NAME,
    displayName: CLUSTER_NODE_SETS_DISPLAY_NAME,
    description: CATALOG_ITEM_DESCRIPTIONS_BY_ID[DEMO_CATALOG_ITEM_IDS.clusterNodeSets],
    scope: 'global-public',
    rateCard: CLUSTER_NODE_SETS_RATE_CARD,
    serviceId: 'cluster',
    instanceTypeId: 'ocp-small',
    instanceTypeLabel: 'OpenShift small',
    diskImageId: DEFAULT_CLUSTER_CATALOG_VERSION_ID,
    diskImageLabel: formatClusterPlatformLabel(DEFAULT_CLUSTER_CATALOG_VERSION_ID),
    clusterVersionMode: 'locked',
    nodeSetId: DEFAULT_CLUSTER_NODE_SET_ID,
    nodeSetLabel: formatClusterNodeSetLabel(DEFAULT_CLUSTER_NODE_SET_ID),
    hostTypeId: DEFAULT_CLUSTER_HOST_TYPE_ID,
    hostTypeLabel: formatClusterHostTypeLabel(DEFAULT_CLUSTER_HOST_TYPE_ID),
    clusterNodeTopologyMode: 'editable',
    clusterTopology: DEFAULT_CLUSTER_TOPOLOGY_NODE_SETS.map((row) => ({ ...row })),
    networkPolicy: createAllEditableCatalogNetworkPolicy(),
    status: 'live',
    createdAt: new Date().toISOString(),
  }
}

/**
 * Clears provider catalog items and selected services for the Telus empty-state prototype.
 * Does not seed demo catalog drafts. Org shells remain available.
 */
export function ensureProviderCatalogDemoItems(): ProviderCatalogDraft[] {
  clearProviderCatalogDraft()
  setProviderSelectedServices([])
  ensureProviderDemoOrganizations()
  return getProviderCatalogItems()
}

/**
 * Marks Provider Admin setup complete with an empty catalog and no selected services.
 * Returns the first catalog item when present; otherwise null.
 */
export function ensureProviderPostSetupPrototype(
  navId: ProviderAdminNavId = 'catalog',
): ProviderCatalogDraft | null {
  setProviderSetupComplete()
  setProviderSelectedServices([])

  const items = ensureProviderCatalogDemoItems()
  ensureProviderDemoOrganizations()

  setProviderActiveNav(navId)
  return items[0] ?? getProviderCatalogDraft()
}

export function isProviderAdminNavId(value: string | null): value is ProviderAdminNavId {
  return (
    value === 'overview' ||
    value === 'catalog' ||
    value === 'services-baremetal' ||
    value === 'services-clusters' ||
    value === 'services-models' ||
    value === 'services-virtual-machines' ||
    value === 'projects-teams' ||
    value === 'infrastructure-data-centers' ||
    value === 'infrastructure-hardware-inventory' ||
    value === 'infrastructure-bmaas-templates' ||
    value === 'networking' ||
    value === 'networking-virtual-networks' ||
    value === 'networking-subnets' ||
    value === 'networking-security-groups' ||
    value === 'networking-external-ip-pools' ||
    value === 'secrets' ||
    value === 'administration-organizations' ||
    value === 'administration-billing' ||
    value === 'administration-rate-cards' ||
    value === 'system'
  )
}
