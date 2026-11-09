import type { CatalogServiceId } from '../providerSetup/templateDemo'
import type { RateCard } from '../providerSetup/templateDemo'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import { getCatalogClusterMachineTypeOption } from '../catalog/catalogPublishConfig'
import { DEFAULT_ONBOARDING_RATE_CARD_ID, findM360RateCard } from './m360Accounts'

export type M360BillableService = CatalogServiceId

export type M360RateLineBillingUnit = 'per-instance' | 'per-endpoint'

export type M360RateLine = {
  id: string
  rateCardId: string
  serviceId: M360BillableService
  resourceLabel: string
  resourceShortLabel: string
  hourlyRate: number
  monthlyRate: number
  currency: string
  billingUnit: M360RateLineBillingUnit
  catalogItemId?: string
  instanceTypeId?: string
  /** Bare-metal OS license add-on; omit on hardware flavor lines. */
  diskImageId?: string
}

export const DEFAULT_M360_RATE_CARD_ID = DEFAULT_ONBOARDING_RATE_CARD_ID

/** Management-plane fee SKU used when composing cluster catalog rates. */
export const CLUSTER_CONTROL_PLANE_INSTANCE_TYPE_ID = 'cluster-control-plane'

/** Host type → bare-metal flavor used for per-worker inheritance. */
export const CLUSTER_HOST_TYPE_TO_BARE_METAL_INSTANCE_TYPE: Record<string, string> = {
  'standard-host': 'small',
  'gpu-host': 'medium',
  'storage-host': 'large',
}

/** Default worker count used for estimated totals in the publish wizard. */
export const CLUSTER_NODE_SET_DEFAULT_WORKER_COUNT: Record<string, number> = {
  'fc430-worker': 3,
  'fc430-infra': 2,
  'fc430-gpu': 2,
}

const DEMO_CATALOG_ITEM_IDS = {
  bareMetalGpuTraining: 'cat-bm-gpu-training',
  bareMetalDenseGpu: 'cat-bm-dense-gpu',
  clusterNodeSets: 'cat-node-sets-fc430',
  vmNetworkAttachments: 'cat-vm-net-attach',
} as const

function line(
  partial: Omit<M360RateLine, 'currency'> & { currency?: string },
): M360RateLine {
  return {
    currency: 'USD',
    ...partial,
  }
}

/** Billable SKU lines seeded per M360 rate card profile. */
export const DEMO_M360_RATE_LINES: M360RateLine[] = [
  // Enterprise — US
  line({
    id: 'line-enterprise-us-bm-small',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'baremetal',
    resourceLabel: 'Small · 16 vCPU · 128 GB · CPU-only',
    resourceShortLabel: 'Bare metal — Small',
    hourlyRate: 3.2,
    monthlyRate: 2150,
    billingUnit: 'per-instance',
    instanceTypeId: 'small',
  }),
  line({
    id: 'line-enterprise-us-bm-medium',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'baremetal',
    resourceLabel: 'Medium · 32 vCPU · 256 GB · A100 40 GB',
    resourceShortLabel: 'Bare metal — Medium',
    hourlyRate: 8.5,
    monthlyRate: 5200,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.bareMetalDenseGpu,
    instanceTypeId: 'medium',
  }),
  line({
    id: 'line-enterprise-us-bm-large',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'baremetal',
    resourceLabel: 'Large · 64 vCPU · 512 GB · A100 80 GB',
    resourceShortLabel: 'Bare metal — Large',
    hourlyRate: 4.25,
    monthlyRate: 2850,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.bareMetalGpuTraining,
    instanceTypeId: 'large',
  }),
  line({
    id: 'line-enterprise-us-cluster-control-plane',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'cluster',
    resourceLabel: 'Control plane · management plane fee',
    resourceShortLabel: 'Cluster — Control plane',
    hourlyRate: 6.75,
    monthlyRate: 4536,
    billingUnit: 'per-instance',
    instanceTypeId: CLUSTER_CONTROL_PLANE_INSTANCE_TYPE_ID,
  }),
  // Package SKUs: Rates page shows composed totals (control plane + workers).
  // Control-plane line stays in data for composition lookups, not as a standalone package.
  line({
    id: 'line-enterprise-us-cluster-small',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'cluster',
    resourceLabel: 'OpenShift small · 3 control plane · 3 workers',
    resourceShortLabel: 'Cluster — OpenShift small',
    hourlyRate: 16.35,
    monthlyRate: 10986,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.clusterNodeSets,
    instanceTypeId: 'ocp-small',
  }),
  line({
    id: 'line-enterprise-us-cluster-medium',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'cluster',
    resourceLabel: 'OpenShift medium · 3 control plane · 6 workers',
    resourceShortLabel: 'Cluster — OpenShift medium',
    hourlyRate: 25.95,
    monthlyRate: 17436,
    billingUnit: 'per-instance',
    instanceTypeId: 'ocp-medium',
  }),
  line({
    id: 'line-enterprise-us-cluster-gpu',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'cluster',
    resourceLabel: 'OpenShift GPU · 3 control plane · 2 GPU workers',
    resourceShortLabel: 'Cluster — OpenShift GPU',
    hourlyRate: 23.75,
    monthlyRate: 14936,
    billingUnit: 'per-instance',
    instanceTypeId: 'ocp-gpu',
  }),
  line({
    id: 'line-enterprise-us-vm-small',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'virtual-machine',
    resourceLabel: 'Small · 4 vCPU · 16 GB',
    resourceShortLabel: 'Virtual machine — Small',
    hourlyRate: 0.48,
    monthlyRate: 320,
    billingUnit: 'per-instance',
    instanceTypeId: 'small',
  }),
  line({
    id: 'line-enterprise-us-vm-medium',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'virtual-machine',
    resourceLabel: 'Medium · 8 vCPU · 32 GB',
    resourceShortLabel: 'Virtual machine — Medium',
    hourlyRate: 0.96,
    monthlyRate: 640,
    billingUnit: 'per-instance',
    instanceTypeId: 'medium',
  }),
  line({
    id: 'line-enterprise-us-vm-large',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'virtual-machine',
    resourceLabel: 'Large · 16 vCPU · 64 GB',
    resourceShortLabel: 'Virtual machine — Large',
    hourlyRate: 1.92,
    monthlyRate: 1280,
    billingUnit: 'per-instance',
    instanceTypeId: 'large',
  }),
  line({
    id: 'line-enterprise-us-vm-net',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'virtual-machine',
    resourceLabel: 'Multi-NIC · 4 vCPU · 16 GB',
    resourceShortLabel: 'Virtual machine — Multi-NIC',
    hourlyRate: 1.25,
    monthlyRate: 850,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.vmNetworkAttachments,
    instanceTypeId: 'small',
  }),
  // Create VM catalog wizard flavors (vm-type-1-*)
  line({
    id: 'line-enterprise-us-vm-type-1-small',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'virtual-machine',
    resourceLabel: 'Small · 1 vCPU · 2 GiB',
    resourceShortLabel: 'Virtual machine — Small',
    hourlyRate: 1.2,
    monthlyRate: 876,
    billingUnit: 'per-instance',
    instanceTypeId: 'vm-type-1-small',
  }),
  line({
    id: 'line-enterprise-us-vm-type-1-medium',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'virtual-machine',
    resourceLabel: 'Medium · 2 vCPU · 10 GiB',
    resourceShortLabel: 'Virtual machine — Medium',
    hourlyRate: 2.4,
    monthlyRate: 1752,
    billingUnit: 'per-instance',
    instanceTypeId: 'vm-type-1-medium',
  }),
  line({
    id: 'line-enterprise-us-vm-type-1-large',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'virtual-machine',
    resourceLabel: 'Large · 4 vCPU · 16 GiB',
    resourceShortLabel: 'Virtual machine — Large',
    hourlyRate: 4.8,
    monthlyRate: 3504,
    billingUnit: 'per-instance',
    instanceTypeId: 'vm-type-1-large',
  }),
  line({
    id: 'line-enterprise-us-vm-type-1-gpu-small',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'virtual-machine',
    resourceLabel: 'GPU Small · 4 vCPU · 16 GiB · 1 GPU',
    resourceShortLabel: 'Virtual machine — GPU Small',
    hourlyRate: 6.4,
    monthlyRate: 4672,
    billingUnit: 'per-instance',
    instanceTypeId: 'vm-type-1-gpu-small',
  }),
  line({
    id: 'line-enterprise-us-vm-type-1-gpu-large',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'virtual-machine',
    resourceLabel: 'GPU Large · 8 vCPU · 32 GiB · 2 GPU',
    resourceShortLabel: 'Virtual machine — GPU Large',
    hourlyRate: 12.8,
    monthlyRate: 9344,
    billingUnit: 'per-instance',
    instanceTypeId: 'vm-type-1-gpu-large',
  }),
  line({
    id: 'line-enterprise-us-model-small',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'models',
    resourceLabel: 'Inference small · 2 vCPU · 8 GiB · 1 replica',
    resourceShortLabel: 'Models — Inference small',
    hourlyRate: 0.18,
    monthlyRate: 120,
    billingUnit: 'per-endpoint',
    instanceTypeId: 'model-small',
  }),
  line({
    id: 'line-enterprise-us-model-medium',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'models',
    resourceLabel: 'Inference medium · 4 vCPU · 16 GiB · 2 replicas',
    resourceShortLabel: 'Models — Inference medium',
    hourlyRate: 0.42,
    monthlyRate: 280,
    billingUnit: 'per-endpoint',
    instanceTypeId: 'model-medium',
  }),
  line({
    id: 'line-enterprise-us-model-gpu',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'models',
    resourceLabel: 'GPU model serving · A100-backed runtime',
    resourceShortLabel: 'Models — GPU serving',
    hourlyRate: 2.4,
    monthlyRate: 1600,
    billingUnit: 'per-endpoint',
    instanceTypeId: 'model-gpu',
  }),
  // Bare-metal OS license add-ons (compose with hardware flavor)
  line({
    id: 'line-enterprise-us-os-rhel-10',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'baremetal',
    resourceLabel: 'RHEL 10 · OS license',
    resourceShortLabel: 'OS — RHEL 10',
    hourlyRate: 0.48,
    monthlyRate: 322,
    billingUnit: 'per-instance',
    diskImageId: 'rhel-10',
  }),
  line({
    id: 'line-enterprise-us-os-rhel-9-4',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'baremetal',
    resourceLabel: 'RHEL 9.4 · OS license',
    resourceShortLabel: 'OS — RHEL 9.4',
    hourlyRate: 0.42,
    monthlyRate: 282,
    billingUnit: 'per-instance',
    diskImageId: 'rhel-9.4',
  }),
  line({
    id: 'line-enterprise-us-os-ubuntu-22-04',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'baremetal',
    resourceLabel: 'Ubuntu 22.04 LTS · included image',
    resourceShortLabel: 'OS — Ubuntu 22.04',
    hourlyRate: 0,
    monthlyRate: 0,
    billingUnit: 'per-instance',
    diskImageId: 'ubuntu-22.04',
  }),
  line({
    id: 'line-enterprise-us-os-rocky-9-3',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'baremetal',
    resourceLabel: 'Rocky Linux 9.3 · included image',
    resourceShortLabel: 'OS — Rocky 9.3',
    hourlyRate: 0,
    monthlyRate: 0,
    billingUnit: 'per-instance',
    diskImageId: 'rocky-9.3',
  }),
  line({
    id: 'line-enterprise-us-os-windows-server-2022',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'baremetal',
    resourceLabel: 'Windows Server 2022 · OS license',
    resourceShortLabel: 'OS — Windows Server 2022',
    hourlyRate: 0.15,
    monthlyRate: 110,
    billingUnit: 'per-instance',
    diskImageId: 'windows-server-2022',
  }),

  // Enterprise — EU (higher regional multiplier on key lines)
  line({
    id: 'line-enterprise-eu-bm-large',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'baremetal',
    resourceLabel: 'Large · 64 vCPU · 512 GB · A100 80 GB',
    resourceShortLabel: 'Bare metal — Large',
    hourlyRate: 4.68,
    monthlyRate: 3135,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.bareMetalGpuTraining,
    instanceTypeId: 'large',
  }),
  line({
    id: 'line-enterprise-eu-cluster-control-plane',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'cluster',
    resourceLabel: 'Control plane · management plane fee',
    resourceShortLabel: 'Cluster — Control plane',
    hourlyRate: 7.43,
    monthlyRate: 4993,
    billingUnit: 'per-instance',
    instanceTypeId: CLUSTER_CONTROL_PLANE_INSTANCE_TYPE_ID,
  }),
  line({
    id: 'line-enterprise-eu-bm-small',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'baremetal',
    resourceLabel: 'Small · 16 vCPU · 128 GB · CPU-only',
    resourceShortLabel: 'Bare metal — Small',
    hourlyRate: 3.52,
    monthlyRate: 2365,
    billingUnit: 'per-instance',
    instanceTypeId: 'small',
  }),
  line({
    id: 'line-enterprise-eu-bm-medium',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'baremetal',
    resourceLabel: 'Medium · 32 vCPU · 256 GB · A100 40 GB',
    resourceShortLabel: 'Bare metal — Medium',
    hourlyRate: 9.35,
    monthlyRate: 5720,
    billingUnit: 'per-instance',
    instanceTypeId: 'medium',
  }),
  line({
    id: 'line-enterprise-eu-cluster-small',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'cluster',
    resourceLabel: 'OpenShift small · 3 control plane · 3 workers',
    resourceShortLabel: 'Cluster — OpenShift small',
    hourlyRate: 24.2,
    monthlyRate: 16280,
    billingUnit: 'per-instance',
    instanceTypeId: 'ocp-small',
  }),
  line({
    id: 'line-enterprise-eu-os-rhel-10',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'baremetal',
    resourceLabel: 'RHEL 10 · OS license',
    resourceShortLabel: 'OS — RHEL 10',
    hourlyRate: 0.53,
    monthlyRate: 356,
    billingUnit: 'per-instance',
    diskImageId: 'rhel-10',
  }),
  line({
    id: 'line-enterprise-eu-os-rhel-9-4',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'baremetal',
    resourceLabel: 'RHEL 9.4 · OS license',
    resourceShortLabel: 'OS — RHEL 9.4',
    hourlyRate: 0.46,
    monthlyRate: 309,
    billingUnit: 'per-instance',
    diskImageId: 'rhel-9.4',
  }),
  line({
    id: 'line-enterprise-eu-os-ubuntu-22-04',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'baremetal',
    resourceLabel: 'Ubuntu 22.04 LTS · included image',
    resourceShortLabel: 'OS — Ubuntu 22.04',
    hourlyRate: 0,
    monthlyRate: 0,
    billingUnit: 'per-instance',
    diskImageId: 'ubuntu-22.04',
  }),
  line({
    id: 'line-enterprise-eu-os-rocky-9-3',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'baremetal',
    resourceLabel: 'Rocky Linux 9.3 · included image',
    resourceShortLabel: 'OS — Rocky 9.3',
    hourlyRate: 0,
    monthlyRate: 0,
    billingUnit: 'per-instance',
    diskImageId: 'rocky-9.3',
  }),

  // Standard — US (subset)
  line({
    id: 'line-standard-us-bm-small',
    rateCardId: 'rate-standard-us',
    serviceId: 'baremetal',
    resourceLabel: 'Small · 16 vCPU · 128 GB · CPU-only',
    resourceShortLabel: 'Bare metal — Small',
    hourlyRate: 3.84,
    monthlyRate: 2580,
    billingUnit: 'per-instance',
    instanceTypeId: 'small',
  }),
  line({
    id: 'line-standard-us-bm-medium',
    rateCardId: 'rate-standard-us',
    serviceId: 'baremetal',
    resourceLabel: 'Medium · 32 vCPU · 256 GB · A100 40 GB',
    resourceShortLabel: 'Bare metal — Medium',
    hourlyRate: 10.2,
    monthlyRate: 6240,
    billingUnit: 'per-instance',
    instanceTypeId: 'medium',
  }),
  line({
    id: 'line-standard-us-bm-large',
    rateCardId: 'rate-standard-us',
    serviceId: 'baremetal',
    resourceLabel: 'Large · 64 vCPU · 512 GB · A100 80 GB',
    resourceShortLabel: 'Bare metal — Large',
    hourlyRate: 5.1,
    monthlyRate: 3420,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.bareMetalGpuTraining,
    instanceTypeId: 'large',
  }),
  line({
    id: 'line-standard-us-os-rhel-10',
    rateCardId: 'rate-standard-us',
    serviceId: 'baremetal',
    resourceLabel: 'RHEL 10 · OS license',
    resourceShortLabel: 'OS — RHEL 10',
    hourlyRate: 0.58,
    monthlyRate: 390,
    billingUnit: 'per-instance',
    diskImageId: 'rhel-10',
  }),
  line({
    id: 'line-standard-us-os-rhel-9-4',
    rateCardId: 'rate-standard-us',
    serviceId: 'baremetal',
    resourceLabel: 'RHEL 9.4 · OS license',
    resourceShortLabel: 'OS — RHEL 9.4',
    hourlyRate: 0.5,
    monthlyRate: 336,
    billingUnit: 'per-instance',
    diskImageId: 'rhel-9.4',
  }),
  line({
    id: 'line-standard-us-os-ubuntu-22-04',
    rateCardId: 'rate-standard-us',
    serviceId: 'baremetal',
    resourceLabel: 'Ubuntu 22.04 LTS · included image',
    resourceShortLabel: 'OS — Ubuntu 22.04',
    hourlyRate: 0,
    monthlyRate: 0,
    billingUnit: 'per-instance',
    diskImageId: 'ubuntu-22.04',
  }),
  line({
    id: 'line-standard-us-os-rocky-9-3',
    rateCardId: 'rate-standard-us',
    serviceId: 'baremetal',
    resourceLabel: 'Rocky Linux 9.3 · included image',
    resourceShortLabel: 'OS — Rocky 9.3',
    hourlyRate: 0,
    monthlyRate: 0,
    billingUnit: 'per-instance',
    diskImageId: 'rocky-9.3',
  }),
  line({
    id: 'line-standard-us-cluster-control-plane',
    rateCardId: 'rate-standard-us',
    serviceId: 'cluster',
    resourceLabel: 'Control plane · management plane fee',
    resourceShortLabel: 'Cluster — Control plane',
    hourlyRate: 8.1,
    monthlyRate: 5443,
    billingUnit: 'per-instance',
    instanceTypeId: CLUSTER_CONTROL_PLANE_INSTANCE_TYPE_ID,
  }),
  line({
    id: 'line-standard-us-cluster-small',
    rateCardId: 'rate-standard-us',
    serviceId: 'cluster',
    resourceLabel: 'OpenShift small · 3 control plane · 3 workers',
    resourceShortLabel: 'Cluster — OpenShift small',
    hourlyRate: 26,
    monthlyRate: 17480,
    billingUnit: 'per-instance',
    instanceTypeId: 'ocp-small',
  }),

  // Government — US
  line({
    id: 'line-gov-us-bm-large',
    rateCardId: 'rate-gov-us',
    serviceId: 'baremetal',
    resourceLabel: 'Large · 64 vCPU · 512 GB · A100 80 GB',
    resourceShortLabel: 'Bare metal — Large',
    hourlyRate: 4.85,
    monthlyRate: 3250,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.bareMetalGpuTraining,
    instanceTypeId: 'large',
  }),
]

const SERVICE_LABELS: Record<M360BillableService, string> = {
  baremetal: 'Bare metal',
  cluster: 'Cluster',
  'virtual-machine': 'Virtual machine',
  models: 'Models',
}

export function getM360RateLineServiceLabel(serviceId: M360BillableService): string {
  return SERVICE_LABELS[serviceId]
}

export type M360RateLineServiceGroup = {
  serviceId: M360BillableService
  label: string
  lines: M360RateLine[]
}

/** Group rate lines by service, with services and resources sorted A–Z. */
export function groupM360RateLinesByService(
  lines: readonly M360RateLine[],
): M360RateLineServiceGroup[] {
  const byService = new Map<M360BillableService, M360RateLine[]>()

  for (const line of lines) {
    const existing = byService.get(line.serviceId)
    if (existing) {
      existing.push(line)
    } else {
      byService.set(line.serviceId, [line])
    }
  }

  return [...byService.entries()]
    .map(([serviceId, serviceLines]) => ({
      serviceId,
      label: getM360RateLineServiceLabel(serviceId),
      lines: [...serviceLines].sort((left, right) =>
        left.resourceLabel.localeCompare(right.resourceLabel, undefined, {
          sensitivity: 'base',
        }),
      ),
    }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }),
    )
}

export function listM360RateLines(rateCardId?: string): M360RateLine[] {
  if (!rateCardId?.trim()) {
    return [...DEMO_M360_RATE_LINES]
  }

  const normalized = rateCardId.trim()
  return DEMO_M360_RATE_LINES.filter((entry) => entry.rateCardId === normalized)
}

export function m360RateLineToRateCard(line: M360RateLine): RateCard {
  return {
    hourlyRate: line.hourlyRate,
    monthlyRate: line.monthlyRate,
    currency: line.currency,
    billingUnit: line.billingUnit === 'per-endpoint' ? 'per-instance' : 'per-instance',
  }
}

export function formatM360RateLineHourly(line: Pick<M360RateLine, 'hourlyRate'>): string {
  return `$${line.hourlyRate.toFixed(2)}/hr`
}

export function formatM360RateLineMonthly(line: Pick<M360RateLine, 'monthlyRate'>): string {
  return `$${line.monthlyRate.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo`
}

export function formatM360RateLineSummary(line: M360RateLine): string {
  const unit = line.billingUnit === 'per-endpoint' ? 'per endpoint' : 'per instance'
  return `${formatM360RateLineHourly(line)} · ${formatM360RateLineMonthly(line)} ${unit}`
}

export function formatM360RateLineCatalogSummary(line: M360RateLine): string {
  return `${formatM360RateLineSummary(line)} for ${line.resourceShortLabel}`
}

/** Compact range for editable tenant pricing (hardware-only rates). */
export function formatM360HourlyRateRange(hourlyRates: readonly number[]): string | null {
  const rates = hourlyRates.filter((rate) => Number.isFinite(rate) && rate >= 0)
  if (rates.length === 0) {
    return null
  }

  const min = Math.min(...rates)
  const max = Math.max(...rates)
  if (min === max) {
    return `$${min.toFixed(2)}/hr`
  }

  return `$${min.toFixed(2)}–$${max.toFixed(2)}/hr`
}

type CatalogRateLineMatchInput = Pick<
  ProviderCatalogDraft,
  'catalogItemId' | 'serviceId' | 'instanceTypeId' | 'diskImageId'
>

export function findM360RateLineForCatalogItem(
  item: CatalogRateLineMatchInput,
  rateCardId: string,
): M360RateLine | null {
  const lines = listM360RateLines(rateCardId)
  const byCatalogId = lines.find(
    (line) => line.catalogItemId === item.catalogItemId && !line.diskImageId,
  )
  if (byCatalogId) {
    return byCatalogId
  }

  const serviceId = item.serviceId ?? 'baremetal'
  const instanceTypeId = item.instanceTypeId?.trim()
  if (!instanceTypeId) {
    return null
  }

  return (
    lines.find(
      (line) =>
        line.serviceId === serviceId &&
        line.instanceTypeId === instanceTypeId &&
        !line.diskImageId,
    ) ?? null
  )
}

export function findM360OsLicenseRateLine(
  diskImageId: string | undefined | null,
  rateCardId = DEFAULT_M360_RATE_CARD_ID,
): M360RateLine | null {
  const normalized = diskImageId?.trim()
  if (!normalized) {
    return null
  }

  return (
    listM360RateLines(rateCardId).find(
      (line) => line.serviceId === 'baremetal' && line.diskImageId === normalized,
    ) ?? null
  )
}

export function resolveCatalogItemMappedCatalogName(
  line: M360RateLine,
  catalogItems: readonly ProviderCatalogDraft[],
): string | null {
  if (!line.catalogItemId) {
    return null
  }

  return (
    catalogItems.find((item) => item.catalogItemId === line.catalogItemId)?.displayName ?? null
  )
}

export function countM360RateLines(rateCardId: string): number {
  return listM360RateLines(rateCardId).length
}

export function listM360RateLineHeadlines(rateCardId: string, limit = 3): string[] {
  return listM360RateLines(rateCardId)
    .slice(0, limit)
    .map((entry) => formatM360RateLineCatalogSummary(entry))
}

export function getM360RateCardDisplayName(rateCardId: string): string {
  return findM360RateCard(rateCardId)?.name ?? rateCardId
}

export function findM360RateLineForPublishSelection(
  serviceId: CatalogServiceId,
  instanceTypeId: string,
  rateCardId = DEFAULT_M360_RATE_CARD_ID,
): M360RateLine | null {
  const normalizedInstanceTypeId = instanceTypeId.trim()
  if (!normalizedInstanceTypeId) {
    return null
  }

  return findM360RateLineForCatalogItem(
    {
      catalogItemId: '',
      serviceId,
      instanceTypeId: normalizedInstanceTypeId,
    },
    rateCardId,
  )
}

export type ClusterComposedRateEstimate = {
  controlPlane: M360RateLine
  worker: M360RateLine
  workerCount: number
  nodeSetId: string
  hostTypeId: string
  hourlyRate: number
  monthlyRate: number
  currency: string
  rateCardId: string
}

export type ClusterTopologyWorkerLineEstimate = {
  nodeSetId: string
  hostTypeId: string
  worker: M360RateLine
  workerCount: number
  hourlySubtotal: number
  monthlySubtotal: number
}

/** Control plane once + worker subtotals for each topology row. */
export type ClusterMultiComposedRateEstimate = {
  controlPlane: M360RateLine
  workerLines: ClusterTopologyWorkerLineEstimate[]
  hourlyRate: number
  monthlyRate: number
  currency: string
  rateCardId: string
}

/** Hours used when converting $/GB-month storage rates into an hourly estimate. */
export const M360_STORAGE_HOURS_PER_MONTH = 730

export type M360StorageTierId = 'balanced' | 'performance' | 'capacity' | 'ai-ml-optimized'

/** Demo storage tier rates ($/GB-month). */
export const M360_STORAGE_TIER_RATES: Record<
  M360StorageTierId,
  { id: M360StorageTierId; label: string; gbMonthRate: number }
> = {
  balanced: { id: 'balanced', label: 'Balanced', gbMonthRate: 0.1 },
  performance: { id: 'performance', label: 'Performance', gbMonthRate: 0.2 },
  capacity: { id: 'capacity', label: 'Capacity', gbMonthRate: 0.05 },
  'ai-ml-optimized': { id: 'ai-ml-optimized', label: 'AI/ML optimized', gbMonthRate: 0.25 },
}

export type M360StorageRateEstimate = {
  tierId: M360StorageTierId
  tierLabel: string
  sizeGiB: number
  gbMonthRate: number
  hourlyRate: number
  monthlyRate: number
}

/** Bare metal / VM compose: hardware + OS license + storage. */
export type BareMetalComposedRateEstimate = {
  hardware: M360RateLine
  osLicense: M360RateLine
  /** Boot / primary disk storage. */
  storage: M360StorageRateEstimate
  /** Extra attached disks (Create VM wizard). */
  additionalStorage: M360StorageRateEstimate[]
  hourlyRate: number
  monthlyRate: number
  currency: string
  rateCardId: string
}

export function isM360StorageTierId(value: string | undefined | null): value is M360StorageTierId {
  return Boolean(value && value in M360_STORAGE_TIER_RATES)
}

export function resolveStorageRateEstimate(
  tierId: string | undefined | null,
  sizeGiB: number,
): M360StorageRateEstimate | null {
  if (!isM360StorageTierId(tierId) || !Number.isFinite(sizeGiB) || sizeGiB <= 0) {
    return null
  }

  const tier = M360_STORAGE_TIER_RATES[tierId]
  const monthlyRate = Math.round(tier.gbMonthRate * sizeGiB * 100) / 100
  const hourlyRate = Math.round((monthlyRate / M360_STORAGE_HOURS_PER_MONTH) * 100) / 100

  return {
    tierId: tier.id,
    tierLabel: tier.label,
    sizeGiB,
    gbMonthRate: tier.gbMonthRate,
    hourlyRate,
    monthlyRate,
  }
}

/** Default local/boot disk size used when a catalog item has no explicit storage step. */
export function getDefaultBootDiskSizeGiB(instanceTypeId: string | undefined | null): number {
  const normalized = instanceTypeId?.trim() ?? ''
  if (/large|xl|gpu/i.test(normalized)) {
    return 960
  }
  if (/medium/i.test(normalized)) {
    return 480
  }
  return 240
}

export function mapClusterHostTypeToBareMetalInstanceType(
  hostTypeId: string | undefined | null,
): string | null {
  const normalized = hostTypeId?.trim()
  if (!normalized) {
    return null
  }
  return CLUSTER_HOST_TYPE_TO_BARE_METAL_INSTANCE_TYPE[normalized] ?? null
}

export function getDefaultClusterWorkerCount(nodeSetId: string | undefined | null): number {
  const normalized = nodeSetId?.trim()
  if (!normalized) {
    return CLUSTER_NODE_SET_DEFAULT_WORKER_COUNT['fc430-worker']
  }
  return CLUSTER_NODE_SET_DEFAULT_WORKER_COUNT[normalized] ?? 3
}

/** Derive legacy ocp-* id for storage/compat from topology defaults. */
export function deriveClusterInstanceTypeId(
  nodeSetId: string | undefined | null,
  hostTypeId: string | undefined | null,
): string {
  const normalizedHost = hostTypeId?.trim()
  const normalizedNodeSet = nodeSetId?.trim()
  if (normalizedHost === 'gpu-host' || normalizedNodeSet === 'fc430-gpu') {
    return 'ocp-gpu'
  }
  if (getDefaultClusterWorkerCount(normalizedNodeSet) >= 6) {
    return 'ocp-medium'
  }
  return 'ocp-small'
}

export function resolveClusterComposedRateEstimate(
  nodeSetId: string,
  hostTypeId: string,
  rateCardId = DEFAULT_M360_RATE_CARD_ID,
  options?: { workerCount?: number },
): ClusterComposedRateEstimate | null {
  const controlPlane = findM360RateLineForPublishSelection(
    'cluster',
    CLUSTER_CONTROL_PLANE_INSTANCE_TYPE_ID,
    rateCardId,
  )
  const workerInstanceTypeId = mapClusterHostTypeToBareMetalInstanceType(hostTypeId)
  if (!controlPlane || !workerInstanceTypeId) {
    return null
  }

  const worker = findM360RateLineForPublishSelection(
    'baremetal',
    workerInstanceTypeId,
    rateCardId,
  )
  if (!worker) {
    return null
  }

  const workerCount = options?.workerCount ?? getDefaultClusterWorkerCount(nodeSetId)
  const hourlyRate =
    Math.round((controlPlane.hourlyRate + workerCount * worker.hourlyRate) * 100) / 100
  const monthlyRate = Math.round(
    controlPlane.monthlyRate + workerCount * worker.monthlyRate,
  )

  return {
    controlPlane,
    worker,
    workerCount,
    nodeSetId,
    hostTypeId,
    hourlyRate,
    monthlyRate,
    currency: controlPlane.currency,
    rateCardId,
  }
}

export function resolveMultiClusterComposedRateEstimate(
  rows: ReadonlyArray<{
    nodeSetId: string
    hostTypeId: string
    workerCount?: number
  }>,
  rateCardId = DEFAULT_M360_RATE_CARD_ID,
): ClusterMultiComposedRateEstimate | null {
  if (rows.length === 0) {
    return null
  }

  const controlPlane = findM360RateLineForPublishSelection(
    'cluster',
    CLUSTER_CONTROL_PLANE_INSTANCE_TYPE_ID,
    rateCardId,
  )
  if (!controlPlane) {
    return null
  }

  const workerLines: ClusterTopologyWorkerLineEstimate[] = []
  for (const row of rows) {
    const nodeSetId = row.nodeSetId.trim()
    const hostTypeId = row.hostTypeId.trim()
    if (!nodeSetId || !hostTypeId) {
      return null
    }

    const workerInstanceTypeId = mapClusterHostTypeToBareMetalInstanceType(hostTypeId)
    if (!workerInstanceTypeId) {
      return null
    }

    const worker = findM360RateLineForPublishSelection(
      'baremetal',
      workerInstanceTypeId,
      rateCardId,
    )
    if (!worker) {
      return null
    }

    const workerCount = row.workerCount ?? getDefaultClusterWorkerCount(nodeSetId)
    workerLines.push({
      nodeSetId,
      hostTypeId,
      worker,
      workerCount,
      hourlySubtotal: Math.round(workerCount * worker.hourlyRate * 100) / 100,
      monthlySubtotal: Math.round(workerCount * worker.monthlyRate),
    })
  }

  const workersHourly = workerLines.reduce((sum, line) => sum + line.hourlySubtotal, 0)
  const workersMonthly = workerLines.reduce((sum, line) => sum + line.monthlySubtotal, 0)

  return {
    controlPlane,
    workerLines,
    hourlyRate: Math.round((controlPlane.hourlyRate + workersHourly) * 100) / 100,
    monthlyRate: Math.round(controlPlane.monthlyRate + workersMonthly),
    currency: controlPlane.currency,
    rateCardId,
  }
}

export function resolveBareMetalComposedRateEstimate(
  instanceTypeId: string | undefined | null,
  diskImageId: string | undefined | null,
  rateCardId = DEFAULT_M360_RATE_CARD_ID,
  options?: {
    storageTierId?: string | null
    bootDiskSizeGiB?: number | null
    additionalDisks?: ReadonlyArray<{ storageTierId: string; sizeGiB: number }>
    /** Service used to resolve the hardware flavor rate line. Defaults to bare metal. */
    serviceId?: M360BillableService
  },
): BareMetalComposedRateEstimate | null {
  const hardwareId = instanceTypeId?.trim()
  const imageId = diskImageId?.trim()
  if (!hardwareId || !imageId) {
    return null
  }

  const serviceId = options?.serviceId ?? 'baremetal'
  const hardware = findM360RateLineForPublishSelection(serviceId, hardwareId, rateCardId)
  if (!hardware) {
    return null
  }

  const osLicense =
    findM360OsLicenseRateLine(imageId, rateCardId) ??
    ({
      id: `synthetic-os-${imageId}`,
      rateCardId,
      serviceId: 'baremetal',
      resourceLabel: imageId,
      resourceShortLabel: imageId,
      hourlyRate: 0,
      monthlyRate: 0,
      currency: hardware.currency,
      billingUnit: 'per-instance' as const,
      diskImageId: imageId,
    } satisfies M360RateLine)

  const storage = resolveStorageRateEstimate(
    options?.storageTierId ?? 'balanced',
    options?.bootDiskSizeGiB ?? getDefaultBootDiskSizeGiB(hardwareId),
  )
  if (!storage) {
    return null
  }

  const additionalStorage = (options?.additionalDisks ?? [])
    .map((disk) => resolveStorageRateEstimate(disk.storageTierId, disk.sizeGiB))
    .filter((estimate): estimate is M360StorageRateEstimate => estimate !== null)

  const additionalHourly = additionalStorage.reduce((sum, estimate) => sum + estimate.hourlyRate, 0)
  const additionalMonthly = additionalStorage.reduce(
    (sum, estimate) => sum + estimate.monthlyRate,
    0,
  )

  return {
    hardware,
    osLicense,
    storage,
    additionalStorage,
    hourlyRate:
      Math.round(
        (hardware.hourlyRate + osLicense.hourlyRate + storage.hourlyRate + additionalHourly) * 100,
      ) / 100,
    monthlyRate: Math.round(
      hardware.monthlyRate + osLicense.monthlyRate + storage.monthlyRate + additionalMonthly,
    ),
    currency: hardware.currency,
    rateCardId,
  }
}

/** Topology used to compose the OpenShift package SKUs on the Rates page. */
const CLUSTER_PACKAGE_COMPOSE: Record<
  string,
  { nodeSetId: string; hostTypeId: string; workerCount?: number }
> = {
  'ocp-small': { nodeSetId: 'fc430-worker', hostTypeId: 'standard-host' },
  'ocp-medium': { nodeSetId: 'fc430-worker', hostTypeId: 'standard-host', workerCount: 6 },
  'ocp-gpu': { nodeSetId: 'fc430-gpu', hostTypeId: 'gpu-host' },
}

export function resolveClusterPackageComposedEstimate(
  instanceTypeId: string | undefined | null,
  rateCardId = DEFAULT_M360_RATE_CARD_ID,
): ClusterComposedRateEstimate | null {
  const normalized = instanceTypeId?.trim()
  if (!normalized) {
    return null
  }
  const topology = CLUSTER_PACKAGE_COMPOSE[normalized]
  if (!topology) {
    return null
  }
  return resolveClusterComposedRateEstimate(
    topology.nodeSetId,
    topology.hostTypeId,
    rateCardId,
    topology.workerCount !== undefined ? { workerCount: topology.workerCount } : undefined,
  )
}

export type M360RatesPageRow = {
  id: string
  resourceLabel: string
  rateSummary: string
  rateDetail?: string
  catalogItemId: string | null
  catalogDisplayName: string | null
}

export type M360RatesPageServiceGroup = {
  serviceId: M360BillableService
  label: string
  rows: M360RatesPageRow[]
}

/**
 * Rates page groups: control-plane fee is baked into OpenShift package rows
 * (not listed as its own package).
 */
export function listM360RatesPageServiceGroups(
  catalogItems: readonly ProviderCatalogDraft[],
  rateCardId = DEFAULT_M360_RATE_CARD_ID,
): M360RatesPageServiceGroup[] {
  const lines = listM360RateLines(rateCardId).filter(
    (line) => line.instanceTypeId !== CLUSTER_CONTROL_PLANE_INSTANCE_TYPE_ID,
  )

  return groupM360RateLinesByService(lines).map((group) => ({
    serviceId: group.serviceId,
    label: group.label,
    rows: group.lines.map((line) => {
      const estimate =
        group.serviceId === 'cluster'
          ? resolveClusterPackageComposedEstimate(line.instanceTypeId, rateCardId)
          : null

      return {
        id: line.id,
        resourceLabel: line.resourceLabel,
        rateSummary: estimate
          ? `${formatClusterComposedRateSummary(estimate)} per instance`
          : formatM360RateLineSummary(line),
        rateDetail: estimate ? formatClusterComposedRateBreakdown(estimate) : undefined,
        catalogItemId: line.catalogItemId?.trim() || null,
        catalogDisplayName: resolveCatalogItemMappedCatalogName(line, catalogItems),
      }
    }),
  }))
}

export function clusterComposedRateToRateCard(
  estimate: Pick<ClusterComposedRateEstimate, 'hourlyRate' | 'monthlyRate' | 'currency'>,
): RateCard {
  return {
    hourlyRate: estimate.hourlyRate,
    monthlyRate: estimate.monthlyRate,
    currency: estimate.currency,
    billingUnit: 'per-instance',
  }
}

export function formatClusterComposedRateSummary(
  estimate: Pick<ClusterComposedRateEstimate, 'hourlyRate' | 'monthlyRate'>,
): string {
  const hourly = estimate.hourlyRate.toFixed(2)
  const monthly = estimate.monthlyRate.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return `$${hourly}/hr · $${monthly}/mo`
}

export function formatClusterComposedRateBreakdown(
  estimate: ClusterComposedRateEstimate | ClusterMultiComposedRateEstimate,
): string {
  const cp = estimate.controlPlane.hourlyRate.toFixed(2)
  if ('workerLines' in estimate) {
    const workers = estimate.workerLines
      .map((line) => `$${line.hourlySubtotal.toFixed(2)}/hr`)
      .join(' · ')
    return `Control plane $${cp}/hr · Workers ${workers}`
  }
  const workerSubtotal = (estimate.workerCount * estimate.worker.hourlyRate).toFixed(2)
  return `Control plane $${cp}/hr · Workers $${workerSubtotal}/hr`
}

export function formatClusterComposedWorkerLineLabel(
  estimate: ClusterComposedRateEstimate,
): string {
  const flavor =
    estimate.worker.resourceShortLabel.replace(/^Bare metal —\s*/i, '').trim() ||
    estimate.worker.resourceShortLabel
  return `${estimate.workerCount} × ${flavor}`
}

export function formatClusterTopologyWorkerLineLabel(
  line: ClusterTopologyWorkerLineEstimate,
): string {
  const flavor =
    line.worker.resourceShortLabel.replace(/^Bare metal —\s*/i, '').trim() ||
    line.worker.resourceShortLabel
  return `${line.workerCount} × ${flavor}`
}

export type ClusterTopologyMachineLineEstimate = {
  machineTypeId: string
  machineTypeLabel: string
  nodeCount: number
  worker: M360RateLine
  hourlySubtotal: number
  monthlySubtotal: number
}

/** Sum of topology rows only (no separate management-plane fee). Matches Node topology editor. */
export type ClusterTopologyMachineRateEstimate = {
  lines: ClusterTopologyMachineLineEstimate[]
  hourlyRate: number
  monthlyRate: number
  currency: string
  rateCardId: string
}

export function resolveClusterTopologyMachineRateEstimate(
  rows: ReadonlyArray<{
    machineTypeId: string
    nodeCount: number
    machineTypeLabel?: string
  }>,
  rateCardId = DEFAULT_M360_RATE_CARD_ID,
): ClusterTopologyMachineRateEstimate | null {
  if (rows.length === 0) {
    return null
  }

  const lines: ClusterTopologyMachineLineEstimate[] = []
  for (const row of rows) {
    const machineTypeId = row.machineTypeId.trim()
    const nodeCount = Math.max(1, Math.round(row.nodeCount))
    if (!machineTypeId) {
      return null
    }

    const machineOption = getCatalogClusterMachineTypeOption(machineTypeId)
    const bareMetalInstanceTypeId =
      machineOption?.bareMetalInstanceTypeId ??
      mapClusterHostTypeToBareMetalInstanceType(machineTypeId)
    if (!bareMetalInstanceTypeId) {
      return null
    }

    const worker = findM360RateLineForPublishSelection(
      'baremetal',
      bareMetalInstanceTypeId,
      rateCardId,
    )
    if (!worker) {
      return null
    }

    lines.push({
      machineTypeId,
      machineTypeLabel: row.machineTypeLabel?.trim() || machineOption?.label || machineTypeId,
      nodeCount,
      worker,
      hourlySubtotal: Math.round(nodeCount * worker.hourlyRate * 100) / 100,
      monthlySubtotal: Math.round(nodeCount * worker.monthlyRate),
    })
  }

  const hourlyRate = Math.round(lines.reduce((sum, line) => sum + line.hourlySubtotal, 0) * 100) / 100
  const monthlyRate = Math.round(lines.reduce((sum, line) => sum + line.monthlySubtotal, 0))

  return {
    lines,
    hourlyRate,
    monthlyRate,
    currency: lines[0]?.worker.currency ?? 'USD',
    rateCardId,
  }
}

export function formatClusterTopologyMachineLineLabel(
  line: ClusterTopologyMachineLineEstimate,
): string {
  return `${line.nodeCount} x ${line.machineTypeLabel}`
}

export function formatClusterTopologyMachineRateBreakdown(
  estimate: ClusterTopologyMachineRateEstimate,
): string {
  return estimate.lines.map((line) => formatClusterTopologyMachineLineLabel(line)).join(' · ')
}

export function formatBareMetalComposedRateSummary(
  estimate: Pick<BareMetalComposedRateEstimate, 'hourlyRate' | 'monthlyRate'>,
): string {
  return formatClusterComposedRateSummary(estimate)
}

export function formatBareMetalComposedRateBreakdown(
  estimate: BareMetalComposedRateEstimate,
): string {
  const hardware = estimate.hardware.hourlyRate.toFixed(2)
  const os =
    estimate.osLicense.hourlyRate <= 0
      ? 'Included'
      : `$${estimate.osLicense.hourlyRate.toFixed(2)}/hr`
  const storageHourly =
    estimate.storage.hourlyRate +
    estimate.additionalStorage.reduce((sum, line) => sum + line.hourlyRate, 0)
  const storage = `$${storageHourly.toFixed(2)}/hr`
  return `Hardware $${hardware}/hr · OS ${os} · Storage ${storage}`
}

export function formatStorageRateHourly(estimate: M360StorageRateEstimate): string {
  return `$${estimate.hourlyRate.toFixed(2)}/hr`
}

export function formatStorageRateMonthly(estimate: M360StorageRateEstimate): string {
  return `$${estimate.monthlyRate.toLocaleString('en-US', { maximumFractionDigits: 2 })}/mo`
}

export function formatStorageRateCardLabel(estimate: M360StorageRateEstimate): string {
  return `${formatStorageRateHourly(estimate)} · ${estimate.sizeGiB} GiB`
}

export function formatBareMetalOsLicenseRateLabel(line: M360RateLine): string {
  if (line.hourlyRate <= 0) {
    return 'Included'
  }
  return `$${line.hourlyRate.toFixed(2)}/hr · OS license`
}
