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
  LEGACY_VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID,
  VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID,
  VM_NETWORK_ATTACHMENTS_DISPLAY_NAME,
  VM_NETWORK_ATTACHMENTS_RATE_CARD,
  VM_NETWORK_ATTACHMENTS_TEMPLATE_NAME,
  VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID,
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
  addProviderCatalogItem,
  getProviderCatalogDraft,
  getProviderCatalogItems,
  getProviderSelectedServices,
  patchProviderCatalogItem,
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
import { DEFAULT_PROVIDER_SERVICE_SELECTION, type ProviderServiceId } from './constants'
import { DEMO_HARBORLINE_CAPITAL_TENANT_ID } from '../providerAdmin/organizations'
import type { ProviderAdminNavId } from '../providerAdmin/constants'

export const MODEL_SERVING_CATALOG_ITEM_ID = DEMO_CATALOG_ITEM_IDS.modelServing
export const MODEL_SERVING_DISPLAY_NAME = 'model-serving-endpoint'
export const MODEL_SERVING_TEMPLATE_REF_ID = 'model-serving-standard'
export const MODEL_SERVING_TEMPLATE_NAME = 'standard-model-serving-template'
export const MODEL_SERVING_RATE_CARD = {
  hourlyRate: 0.18,
  monthlyRate: 120,
  currency: 'USD',
  billingUnit: 'per-instance' as const,
}

export const VM_GENERAL_PURPOSE_CATALOG_ITEM_ID = DEMO_CATALOG_ITEM_IDS.vmGeneralPurpose
export const VM_GENERAL_PURPOSE_DISPLAY_NAME = 'general-purpose-rhel-vm'
export const VM_GENERAL_PURPOSE_TEMPLATE_REF_ID = 'vm-general-purpose'
export const VM_GENERAL_PURPOSE_TEMPLATE_NAME = 'general-purpose-rhel-vm'
export const VM_GENERAL_PURPOSE_RATE_CARD = {
  hourlyRate: 2.4,
  monthlyRate: 1610,
  currency: 'USD',
  billingUnit: 'per-instance' as const,
}

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
  VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID,
  VM_GENERAL_PURPOSE_CATALOG_ITEM_ID,
  MODEL_SERVING_CATALOG_ITEM_ID,
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
    addonOperatorsMode: 'locked',
    addonOperators: [
      { operatorId: 'nvidia-gpu-operator', mode: 'mandatory' },
      { operatorId: 'node-feature-discovery', mode: 'mandatory' },
    ],
    networkPolicy: createAllEditableCatalogNetworkPolicy(),
    status: 'live',
    createdAt: new Date().toISOString(),
  }
}

/** Draft helper for Virtual Machine network-attachments offering. */
export function createVmNetworkAttachmentsCatalogDraft(): ProviderCatalogDraft {
  return {
    catalogItemId: VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID,
    templateRefId: VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID,
    templateName: VM_NETWORK_ATTACHMENTS_TEMPLATE_NAME,
    displayName: VM_NETWORK_ATTACHMENTS_DISPLAY_NAME,
    description: CATALOG_ITEM_DESCRIPTIONS_BY_ID[DEMO_CATALOG_ITEM_IDS.vmNetworkAttachments],
    scope: 'global-public',
    rateCard: VM_NETWORK_ATTACHMENTS_RATE_CARD,
    serviceId: 'virtual-machine',
    instanceTypeId: 'standard',
    instanceTypeLabel: 'Standard (4 vCPU · 16 GB RAM)',
    diskImageId: 'rhel-9-4',
    diskImageLabel: 'RHEL 9.4',
    hardwareOsMode: 'locked',
    osImageMode: 'editable',
    networkPolicy: createAllEditableCatalogNetworkPolicy(),
    status: 'live',
    createdAt: new Date().toISOString(),
  }
}

/** Draft helper for general-purpose RHEL virtual machine offering. */
export function createVmGeneralPurposeCatalogDraft(): ProviderCatalogDraft {
  return {
    catalogItemId: VM_GENERAL_PURPOSE_CATALOG_ITEM_ID,
    templateRefId: VM_GENERAL_PURPOSE_TEMPLATE_REF_ID,
    templateName: VM_GENERAL_PURPOSE_TEMPLATE_NAME,
    displayName: VM_GENERAL_PURPOSE_DISPLAY_NAME,
    description: CATALOG_ITEM_DESCRIPTIONS_BY_ID[DEMO_CATALOG_ITEM_IDS.vmGeneralPurpose],
    scope: 'global-public',
    rateCard: VM_GENERAL_PURPOSE_RATE_CARD,
    serviceId: 'virtual-machine',
    instanceTypeId: 'vm-type-1-medium',
    instanceTypeLabel: 'Medium (2 vCPU · 10 GB RAM)',
    diskImageId: 'rhel-9-4',
    diskImageLabel: 'RHEL 9.4',
    hardwareOsMode: 'editable',
    osImageMode: 'editable',
    networkPolicy: createAllEditableCatalogNetworkPolicy(),
    status: 'live',
    createdAt: new Date().toISOString(),
  }
}

/** Draft helper for Models as a Service offering. */
export function createModelServingCatalogDraft(): ProviderCatalogDraft {
  return {
    catalogItemId: MODEL_SERVING_CATALOG_ITEM_ID,
    templateRefId: MODEL_SERVING_TEMPLATE_REF_ID,
    templateName: MODEL_SERVING_TEMPLATE_NAME,
    displayName: MODEL_SERVING_DISPLAY_NAME,
    description: CATALOG_ITEM_DESCRIPTIONS_BY_ID[DEMO_CATALOG_ITEM_IDS.modelServing],
    scope: 'global-public',
    rateCard: MODEL_SERVING_RATE_CARD,
    serviceId: 'models',
    instanceTypeId: 'model-small',
    instanceTypeLabel: 'Small',
    diskImageId: 'vllm-runtime',
    diskImageLabel: 'vLLM runtime',
    networkPolicy: createAllEditableCatalogNetworkPolicy(),
    status: 'live',
    createdAt: new Date().toISOString(),
  }
}

function hasCatalogItemId(items: ProviderCatalogDraft[], catalogItemId: string): boolean {
  return items.some((item) => item.catalogItemId === catalogItemId)
}

function hasBareMetalGpuCatalogItem(items: ProviderCatalogDraft[]): boolean {
  return (
    hasCatalogItemId(items, BARE_METAL_GPU_CATALOG_ITEM_ID) ||
    hasCatalogItemId(items, LEGACY_BARE_METAL_GPU_CATALOG_ITEM_ID)
  )
}

function hasClusterNodeSetsCatalogItem(items: ProviderCatalogDraft[]): boolean {
  return hasCatalogItemId(items, CLUSTER_NODE_SETS_CATALOG_ITEM_ID)
}

function hasVmNetworkAttachmentsCatalogItem(items: ProviderCatalogDraft[]): boolean {
  return (
    hasCatalogItemId(items, VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID) ||
    hasCatalogItemId(items, LEGACY_VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID)
  )
}

function hasVmGeneralPurposeCatalogItem(items: ProviderCatalogDraft[]): boolean {
  return hasCatalogItemId(items, VM_GENERAL_PURPOSE_CATALOG_ITEM_ID)
}

function hasModelServingCatalogItem(items: ProviderCatalogDraft[]): boolean {
  return hasCatalogItemId(items, MODEL_SERVING_CATALOG_ITEM_ID)
}

/**
 * Ensures demo catalog offerings exist across bare metal, cluster, VM, and models.
 */
export function ensureProviderCatalogDemoItems(): ProviderCatalogDraft[] {
  ensureProviderDemoOrganizations()

  let items = getProviderCatalogItems()

  if (!hasBareMetalGpuCatalogItem(items)) {
    addProviderCatalogItem(createDefaultCatalogDraft())
    items = getProviderCatalogItems()
  }

  if (!hasClusterNodeSetsCatalogItem(items)) {
    addProviderCatalogItem(createClusterNodeSetsCatalogDraft())
    items = getProviderCatalogItems()
  } else {
    const clusterItem = items.find((item) => item.catalogItemId === CLUSTER_NODE_SETS_CATALOG_ITEM_ID)
    if (clusterItem && (!clusterItem.addonOperators || clusterItem.addonOperators.length === 0)) {
      patchProviderCatalogItem(CLUSTER_NODE_SETS_CATALOG_ITEM_ID, {
        addonOperatorsMode: 'locked',
        addonOperators: [
          { operatorId: 'nvidia-gpu-operator', mode: 'mandatory' },
          { operatorId: 'node-feature-discovery', mode: 'mandatory' },
        ],
      })
      items = getProviderCatalogItems()
    }
  }

  if (!hasVmNetworkAttachmentsCatalogItem(items)) {
    addProviderCatalogItem(createVmNetworkAttachmentsCatalogDraft())
    items = getProviderCatalogItems()
  } else {
    const vmItem = items.find((item) => item.catalogItemId === VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID)
    if (vmItem && (!vmItem.hardwareOsMode || !vmItem.osImageMode)) {
      patchProviderCatalogItem(VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID, {
        hardwareOsMode: 'locked',
        osImageMode: 'editable',
      })
      items = getProviderCatalogItems()
    }
  }

  if (!hasVmGeneralPurposeCatalogItem(items)) {
    addProviderCatalogItem(createVmGeneralPurposeCatalogDraft())
    items = getProviderCatalogItems()
  } else {
    const vmItem = items.find((item) => item.catalogItemId === VM_GENERAL_PURPOSE_CATALOG_ITEM_ID)
    if (vmItem && (!vmItem.hardwareOsMode || !vmItem.osImageMode)) {
      patchProviderCatalogItem(VM_GENERAL_PURPOSE_CATALOG_ITEM_ID, {
        hardwareOsMode: 'editable',
        osImageMode: 'editable',
      })
      items = getProviderCatalogItems()
    }
  }

  if (!hasModelServingCatalogItem(items)) {
    addProviderCatalogItem(createModelServingCatalogDraft())
    items = getProviderCatalogItems()
  }

  const selectedServices = getProviderSelectedServices()
  const nextServices: ProviderServiceId[] = [
    ...new Set<ProviderServiceId>([
      ...(selectedServices.length > 0 ? selectedServices : DEFAULT_PROVIDER_SERVICE_SELECTION),
      'baremetal',
      'cluster',
      'models',
      'virtual-machine',
    ]),
  ]
  const servicesChanged =
    nextServices.length !== selectedServices.length ||
    nextServices.some((serviceId) => !selectedServices.includes(serviceId))
  if (servicesChanged) {
    setProviderSelectedServices(nextServices)
  }

  return getProviderCatalogItems()
}

/**
 * Seeds post-setup Provider Admin state so landing-page prototype links can open finished screens.
 */
export function ensureProviderPostSetupPrototype(
  navId: ProviderAdminNavId = 'catalog',
): ProviderCatalogDraft | null {
  setProviderSetupComplete()
  setProviderSelectedServices(DEFAULT_PROVIDER_SERVICE_SELECTION)

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
