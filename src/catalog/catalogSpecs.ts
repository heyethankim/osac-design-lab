import type { ProviderCatalogDraft } from '../providerSetup/storage'
import type { CatalogServiceId } from '../providerSetup/templateDemo'
import {
  CATALOG_INSTANCE_TYPE_OPTIONS,
  formatClusterPlatformLabel,
  formatClusterTopologyNodeSetValue,
  getCatalogClusterNodeTopologyModeLabel,
  getCatalogClusterVersionModeLabel,
  normalizeCatalogDiskImageDisplayLabel,
  formatCatalogDiskImageLabel,
  getCatalogHardwareOsModeLabel,
  getCatalogOsImageModeLabel,
  resolveBaremetalInstanceTypeHardware,
  resolveCatalogClusterNodeTopologyMode,
  resolveCatalogClusterTopology,
  resolveCatalogClusterVersionMode,
  resolveCatalogHardwareOsMode,
  resolveCatalogOsImageMode,
  type CatalogClusterNodeTopologyMode,
  type CatalogClusterTopologyNodeSet,
  type CatalogClusterVersionMode,
  type CatalogHardwareOsMode,
} from './catalogPublishConfig'
import { resolveHardwareSpecsForCatalogItem } from './hardwareSpecs'

export type CatalogSpecRow = {
  label: string
  value: string
  /** Optional status chip (e.g. Locked / Editable for cluster version). */
  badge?: {
    text: string
    color: 'blue' | 'teal' | 'grey' | 'green' | 'orange' | 'purple'
  }
}

export function getCatalogSpecRowValue(rows: CatalogSpecRow[], label: string): string {
  return rows.find((row) => row.label === label)?.value ?? '—'
}

/** Demo offering: object-level validation on `node_sets.fc430`. */
export const CLUSTER_NODE_SETS_TEMPLATE_REF_ID = 'cl-node-sets-fc430'
export const CLUSTER_NODE_SETS_TEMPLATE_NAME = 'standard-cluster-template'
export const CLUSTER_NODE_SETS_DISPLAY_NAME = 'cluster-node-sets-object'
export const CLUSTER_NODE_SETS_CATALOG_ITEM_ID = 'cat-node-sets-fc430'
/** Pre-Kubernetes-convention identifiers — matched when migrating stored catalogs. */
export const LEGACY_CLUSTER_NODE_SETS_TEMPLATE_REF_ID = 'cl_node_sets_fc430'
export const LEGACY_CLUSTER_NODE_SETS_TEMPLATE_NAME = 'cluster-node-sets-object'
export const LEGACY_CLUSTER_NODE_SETS_DISPLAY_NAME = 'Cluster - Node Sets Object'
export const LEGACY_CLUSTER_NODE_SETS_CATALOG_ITEM_ID = 'cat_NODE_SETS_FC430'
export const CLUSTER_NODE_SETS_DESCRIPTION =
  'Demonstrates a validation_schema for a whole object-valued field (node_sets.fc430), not just a single scalar leaf like node_sets.fc430.size. The whole ClusterNodeSet object is validated as a unit: host_type is pinned, and size is bounded between 1 and 4.'

export const CLUSTER_NODE_SETS_TEMPLATE_DESCRIPTION =
  'Provisions OpenShift clusters using the Assisted Installer / Hive path, including control-plane bootstrap and worker join.'

export const CLUSTER_NODE_SETS_RATE_CARD = {
  // Composed: control plane $6.75 + 3 × bare-metal small $3.20
  hourlyRate: 16.35,
  monthlyRate: 10986,
  currency: 'USD',
  billingUnit: 'per-instance' as const,
}

/** Extra detail-page rows for Cluster offerings (tenant-facing). */
const CLUSTER_NODE_SETS_DETAIL_ROWS: CatalogSpecRow[] = []

/** Demo offering: whole-array validation on `network_attachments`. */
export const VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID = 'vm-network-attachments'
export const VM_NETWORK_ATTACHMENTS_TEMPLATE_NAME = 'vm-configurable-network-attachments'
export const VM_NETWORK_ATTACHMENTS_DISPLAY_NAME = 'vm-configurable-network-attachments'
export const VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID = 'cat-vm-net-attach'
export const LEGACY_VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID = 'vm_network_attachments'
export const LEGACY_VM_NETWORK_ATTACHMENTS_DISPLAY_NAME =
  'VM with Configurable Network Attachments'
export const LEGACY_VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID = 'cat_VM_NET_ATTACH'
export const VM_NETWORK_ATTACHMENTS_DESCRIPTION =
  'Virtual machine offering with a whole-array field definition for `network_attachments`. Defaults to a single NIC on the shared subnet/security group; users may edit the array to add a second NIC, but the array as a whole is capped at 2 entries via validation_schema.'

export const VM_NETWORK_ATTACHMENTS_RATE_CARD = {
  hourlyRate: 1.25,
  monthlyRate: 850,
  currency: 'USD',
  billingUnit: 'per-instance' as const,
}

/** Extra drawer-only rows for Virtual Machine offerings. */
const VM_NETWORK_ATTACHMENTS_DETAIL_ROWS: CatalogSpecRow[] = [
  {
    label: 'Network attachments',
    value: '1 NIC default · shared subnet/SG (max 2)',
  },
  { label: 'Boot disk', value: '100 GB · virtio' },
  { label: 'Validation', value: 'network_attachments array schema (max 2)' },
]

export function getDraftServiceId(
  item: Pick<ProviderCatalogDraft, 'serviceId'>,
): CatalogServiceId {
  return item.serviceId ?? 'baremetal'
}

/** Parse `Medium (4 vCPU · 16 GB)` from publish wizard storage. */
export function parseCatalogInstanceTypeParts(instanceTypeLabel: string): {
  label: string
  size?: string
} {
  const match = instanceTypeLabel.trim().match(/^(.*?)\s*\((.+)\)\s*$/)
  if (match) {
    return { label: match[1].trim(), size: match[2].trim() }
  }
  return { label: instanceTypeLabel.trim() }
}

/** Small / Medium / Large preset label for bare metal catalog specifications. */
export function resolveBaremetalSizeLabel(
  instanceTypeId?: string,
  instanceTypeLabel?: string,
): string | undefined {
  if (instanceTypeId) {
    const byId = CATALOG_INSTANCE_TYPE_OPTIONS.find((option) => option.id === instanceTypeId)
    if (byId) {
      return byId.label
    }
  }

  if (instanceTypeLabel?.trim()) {
    const { label } = parseCatalogInstanceTypeParts(instanceTypeLabel.trim())
    if (CATALOG_INSTANCE_TYPE_OPTIONS.some((option) => option.label === label)) {
      return label
    }
  }

  return undefined
}

export function resolveCatalogOsImage(
  item: Pick<
    ProviderCatalogDraft,
    | 'serviceId'
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeLabel'
    | 'diskImageLabel'
    | 'diskImageId'
    | 'instanceTypeId'
  >,
): string {
  const rows = resolveCatalogSpecRows(item)
  const fromDiskImage = rows.find(
    (row) => row.label === 'OS image' || row.label === 'Disk image',
  )?.value?.trim()
  if (fromDiskImage) {
    return fromDiskImage
  }

  const fromOsImage = rows.find((row) => row.label === 'OS image')?.value?.trim()
  if (fromOsImage) {
    return normalizeCatalogDiskImageDisplayLabel(fromOsImage)
  }

  const fromCatalog = formatCatalogDiskImageLabel(item.diskImageId, item.diskImageLabel)
  if (fromCatalog) {
    return fromCatalog
  }

  return '—'
}

const VM_CATALOG_HIGHLIGHT_LABELS = [
  'Instance type',
  'CPU',
  'RAM',
  'GPU',
  'OS image',
] as const

type VmInstanceHardware = {
  sizeLabel: string
  cpu: string
  ram: string
  gpu: string
}

const VM_INSTANCE_TYPE_HARDWARE: Readonly<Record<string, VmInstanceHardware>> = {
  standard: { sizeLabel: 'Standard', cpu: '4 vCPU', ram: '16 GB', gpu: 'None' },
  'vm-type-1-small': { sizeLabel: 'Small', cpu: '1 vCPU', ram: '2 GB', gpu: 'None' },
  'vm-type-1-medium': { sizeLabel: 'Medium', cpu: '2 vCPU', ram: '10 GB', gpu: 'None' },
  'vm-type-1-large': { sizeLabel: 'Large', cpu: '4 vCPU', ram: '16 GB', gpu: 'None' },
  'vm-type-1-gpu-small': { sizeLabel: 'GPU Small', cpu: '4 vCPU', ram: '16 GB', gpu: '1 GPU' },
  'vm-type-1-gpu-large': { sizeLabel: 'GPU Large', cpu: '8 vCPU', ram: '32 GB', gpu: '2 GPU' },
}

/** Parse `Medium (2 vCPU · 10 GB RAM)` / `GPU Small (4 vCPU · 16 GB · 1 GPU)`. */
export function resolveVmInstanceTypeHardware(
  instanceTypeId?: string | null,
  instanceTypeLabel?: string | null,
): VmInstanceHardware | null {
  const byId = instanceTypeId?.trim()
    ? VM_INSTANCE_TYPE_HARDWARE[instanceTypeId.trim()]
    : undefined
  if (byId) {
    return byId
  }

  const rawLabel = instanceTypeLabel?.trim()
  if (!rawLabel) {
    return null
  }

  const { label, size } = parseCatalogInstanceTypeParts(rawLabel)
  if (!size) {
    return { sizeLabel: label || rawLabel, cpu: '—', ram: '—', gpu: 'None' }
  }

  const parts = size.split('·').map((part) => part.trim()).filter(Boolean)
  return {
    sizeLabel: label || rawLabel,
    cpu: parts[0] ?? '—',
    ram: parts[1] ?? '—',
    gpu: parts[2] ?? 'None',
  }
}

/**
 * Virtual machine card/list rows match bare metal:
 * Instance type (Locked/Editable) + CPU/RAM/GPU + OS image (Locked/Editable).
 */
function buildVirtualMachineCatalogSpecRows(
  item: Pick<
    ProviderCatalogDraft,
    | 'instanceTypeId'
    | 'instanceTypeLabel'
    | 'diskImageId'
    | 'diskImageLabel'
    | 'hardwareOsMode'
    | 'osImageMode'
  >,
  options?: { includeDetails?: boolean },
): CatalogSpecRow[] {
  const hardware = resolveVmInstanceTypeHardware(item.instanceTypeId, item.instanceTypeLabel)
  const diskImage =
    formatCatalogDiskImageLabel(item.diskImageId, item.diskImageLabel) ??
    item.diskImageLabel?.trim() ??
    '—'
  const hardwareOsBadge = getHardwareOsModeBadge(item.hardwareOsMode)
  const osImageBadge = getOsImageModeBadge(item.osImageMode, item.hardwareOsMode)

  const rows: CatalogSpecRow[] = hardware
    ? [
        { label: 'Instance type', value: hardware.sizeLabel, badge: hardwareOsBadge },
        { label: 'CPU', value: hardware.cpu },
        { label: 'RAM', value: hardware.ram },
        { label: 'GPU', value: hardware.gpu },
        { label: 'OS image', value: diskImage, badge: osImageBadge },
      ]
    : [
        ...(item.instanceTypeLabel
          ? [
              {
                label: 'Instance type',
                value: parseCatalogInstanceTypeParts(item.instanceTypeLabel).label,
                badge: hardwareOsBadge,
              } satisfies CatalogSpecRow,
            ]
          : []),
        { label: 'CPU', value: '—' },
        { label: 'RAM', value: '—' },
        { label: 'GPU', value: 'None' },
        { label: 'OS image', value: diskImage, badge: osImageBadge },
      ]

  if (options?.includeDetails) {
    return [...rows, ...VM_NETWORK_ATTACHMENTS_DETAIL_ROWS]
  }

  return rows
}

/** Instance type + CPU/RAM/GPU + OS image for Virtual Machine catalog drawers. */
export function resolveVmCatalogHighlightRows(
  item: Pick<
    ProviderCatalogDraft,
    | 'serviceId'
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeId'
    | 'instanceTypeLabel'
    | 'diskImageId'
    | 'diskImageLabel'
    | 'hardwareOsMode'
    | 'osImageMode'
  >,
): CatalogSpecRow[] {
  const rows = buildVirtualMachineCatalogSpecRows(item)
  return VM_CATALOG_HIGHLIGHT_LABELS.map((label) => rows.find((row) => row.label === label)).filter(
    (row): row is CatalogSpecRow => Boolean(row),
  )
}

function getClusterVersionModeBadge(
  mode: CatalogClusterVersionMode | undefined | null,
): CatalogSpecRow['badge'] {
  const resolved = resolveCatalogClusterVersionMode(mode)
  return {
    text: getCatalogClusterVersionModeLabel(resolved),
    color: resolved === 'editable' ? 'purple' : 'grey',
  }
}

/** Prefer stored label; fall back to id → platform label (avoids "—" when only id is set). */
function resolveClusterVersionDisplayLabel(
  item: Pick<ProviderCatalogDraft, 'diskImageLabel' | 'diskImageId'>,
): string {
  const fromLabel = item.diskImageLabel?.trim()
  if (fromLabel) {
    return formatClusterPlatformLabel(fromLabel)
  }
  const fromId = item.diskImageId?.trim()
  if (fromId) {
    return formatClusterPlatformLabel(fromId)
  }
  return ''
}

function getClusterNodeTopologyModeBadge(
  mode: CatalogClusterNodeTopologyMode | undefined | null,
): CatalogSpecRow['badge'] {
  const resolved = resolveCatalogClusterNodeTopologyMode(mode)
  return {
    text: getCatalogClusterNodeTopologyModeLabel(resolved),
    color: resolved === 'editable' ? 'purple' : 'grey',
  }
}

function getHardwareOsModeBadge(
  mode: CatalogHardwareOsMode | undefined | null,
): CatalogSpecRow['badge'] {
  const resolved = resolveCatalogHardwareOsMode(mode)
  return {
    text: getCatalogHardwareOsModeLabel(resolved),
    color: resolved === 'editable' ? 'purple' : 'grey',
  }
}

function getOsImageModeBadge(
  mode: CatalogHardwareOsMode | undefined | null,
  hardwareFallback?: CatalogHardwareOsMode | undefined | null,
): CatalogSpecRow['badge'] {
  const resolved = resolveCatalogOsImageMode(mode, hardwareFallback)
  return {
    text: getCatalogOsImageModeLabel(resolved),
    color: resolved === 'editable' ? 'purple' : 'grey',
  }
}

/** Parent row for nested node-set children (matches Instance type → CPU/RAM/GPU). */
export const CLUSTER_NODE_SETS_PARENT_LABEL = 'Node sets'

/** Card/list summary: "3 pools · 10 nodes". */
export function formatClusterTopologySummary(
  topology: ReadonlyArray<CatalogClusterTopologyNodeSet>,
): string {
  const pools = topology.length
  const nodes = topology.reduce((sum, row) => sum + row.nodeCount, 0)
  const poolLabel = pools === 1 ? 'pool' : 'pools'
  const nodeLabel = nodes === 1 ? 'node' : 'nodes'
  return `${pools} ${poolLabel} · ${nodes} ${nodeLabel}`
}

function getAddonOperatorShortName(operatorId: string): string {
  switch (operatorId) {
    case 'nvidia-gpu-operator':
      return 'NVIDIA GPU'
    case 'node-feature-discovery':
      return 'NFD'
    default:
      return operatorId
  }
}

function getAddonOperatorsModeBadge(
  mode: 'locked' | 'editable' | undefined | null,
): CatalogSpecRow['badge'] {
  const resolved = mode === 'editable' ? 'editable' : 'locked'
  return {
    text: resolved === 'editable' ? 'Editable' : 'Locked',
    color: resolved === 'editable' ? 'purple' : 'grey',
  }
}

function buildClusterTopologySpecRows(
  topology: ReadonlyArray<CatalogClusterTopologyNodeSet>,
  options?: {
    compact?: boolean
    topologyMode?: CatalogClusterNodeTopologyMode
    summaryOnly?: boolean
  },
): CatalogSpecRow[] {
  const topologyBadge = getClusterNodeTopologyModeBadge(options?.topologyMode)

  if (options?.summaryOnly) {
    return [
      {
        label: CLUSTER_NODE_SETS_PARENT_LABEL,
        value: formatClusterTopologySummary(topology),
        badge: topologyBadge,
      },
    ]
  }

  const rows: CatalogSpecRow[] = [
    {
      label: CLUSTER_NODE_SETS_PARENT_LABEL,
      value: topologyBadge?.text ?? 'Locked',
      badge: topologyBadge,
    },
  ]
  for (const nodeSet of topology) {
    rows.push({
      label: nodeSet.name,
      value: formatClusterTopologyNodeSetValue(nodeSet, { compact: options?.compact }),
    })
  }
  return rows
}

function buildClusterCatalogSpecRows(
  item: Pick<
    ProviderCatalogDraft,
    | 'diskImageLabel'
    | 'diskImageId'
    | 'clusterVersionMode'
    | 'nodeSetId'
    | 'nodeSetLabel'
    | 'hostTypeId'
    | 'hostTypeLabel'
    | 'clusterNodeTopologyMode'
    | 'clusterTopology'
    | 'addonOperators'
    | 'addonOperatorsMode'
  >,
  options?: { includeDetails?: boolean },
): CatalogSpecRow[] {
  const includeDetails = Boolean(options?.includeDetails)
  const versionLabel = resolveClusterVersionDisplayLabel(item)
  const topology = resolveCatalogClusterTopology(item.clusterTopology)
  const rows: CatalogSpecRow[] = [
    {
      label: 'Cluster version',
      value: versionLabel || '—',
      badge: getClusterVersionModeBadge(item.clusterVersionMode),
    },
    ...buildClusterTopologySpecRows(topology, {
      compact: !includeDetails,
      topologyMode: item.clusterNodeTopologyMode,
      summaryOnly: !includeDetails,
    }),
  ]

  if (includeDetails && CLUSTER_NODE_SETS_DETAIL_ROWS.length > 0) {
    rows.push(...CLUSTER_NODE_SETS_DETAIL_ROWS)
  }

  const addonOperators = item.addonOperators ?? []
  if (addonOperators.length > 0) {
    rows.push({
      label: 'Add-on operators',
      value: addonOperators.map((selection) => getAddonOperatorShortName(selection.operatorId)).join(', '),
      badge: getAddonOperatorsModeBadge(item.addonOperatorsMode),
    })
  }

  return rows
}

/** Cluster version + node topology for Cluster catalog drawers. */
export function resolveClusterCatalogHighlightRows(
  item: Pick<
    ProviderCatalogDraft,
    | 'serviceId'
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeLabel'
    | 'diskImageLabel'
    | 'diskImageId'
    | 'clusterVersionMode'
    | 'nodeSetId'
    | 'nodeSetLabel'
    | 'hostTypeId'
    | 'hostTypeLabel'
    | 'clusterNodeTopologyMode'
    | 'clusterTopology'
  >,
): CatalogSpecRow[] {
  return resolveCatalogSpecRows(item)
}

function resolveBaremetalDiskImageLabel(
  item: Pick<
    ProviderCatalogDraft,
    'templateRefId' | 'templateName' | 'diskImageId' | 'diskImageLabel'
  >,
  hardwareOsImage: string,
): string {
  return (
    formatCatalogDiskImageLabel(item.diskImageId, item.diskImageLabel) ??
    normalizeCatalogDiskImageDisplayLabel(hardwareOsImage)
  )
}

function buildBaremetalCatalogSpecRows(
  item: Pick<
    ProviderCatalogDraft,
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeId'
    | 'instanceTypeLabel'
    | 'diskImageId'
    | 'diskImageLabel'
    | 'hardwareOsMode'
    | 'osImageMode'
  >,
): CatalogSpecRow[] {
  const hardware = resolveHardwareSpecsForCatalogItem(item)
  const diskImage = resolveBaremetalDiskImageLabel(item, hardware.osImage)
  const typeHardware = resolveBaremetalInstanceTypeHardware(
    item.instanceTypeId,
    item.instanceTypeLabel,
  )
  const hardwareOsBadge = getHardwareOsModeBadge(item.hardwareOsMode)
  const osImageBadge = getOsImageModeBadge(item.osImageMode, item.hardwareOsMode)

  if (typeHardware) {
    return [
      { label: 'Instance type', value: typeHardware.sizeLabel, badge: hardwareOsBadge },
      { label: 'CPU', value: typeHardware.cpu },
      { label: 'RAM', value: typeHardware.ram },
      { label: 'GPU', value: typeHardware.gpu },
      { label: 'OS image', value: diskImage, badge: osImageBadge },
    ]
  }

  const sizeLabel = resolveBaremetalSizeLabel(item.instanceTypeId, item.instanceTypeLabel)
  const rows: CatalogSpecRow[] = []

  if (sizeLabel) {
    rows.push({ label: 'Instance type', value: sizeLabel, badge: hardwareOsBadge })
  }

  rows.push(
    { label: 'CPU', value: hardware.cpu },
    { label: 'RAM', value: hardware.ram },
    { label: 'GPU', value: hardware.gpu },
    { label: 'OS image', value: diskImage, badge: osImageBadge },
  )

  return rows
}

/**
 * Bare metal card/list rows: Instance type (with Locked/Editable) + CPU/RAM/GPU + OS image.
 * Instance type carries the hardware access mode; OS image carries its own.
 */
export function resolveBaremetalCatalogCardSpecRows(
  item: Parameters<typeof buildBaremetalCatalogSpecRows>[0],
): CatalogSpecRow[] {
  return buildBaremetalCatalogSpecRows(item)
}

/** Grid and list catalog views share the same card-level specification rows. */
export function resolveCatalogCardSpecRows(
  item: Parameters<typeof resolveCatalogSpecRows>[0],
): CatalogSpecRow[] {
  const serviceId = getDraftServiceId(item)
  if (serviceId === 'baremetal') {
    return resolveBaremetalCatalogCardSpecRows(item)
  }
  if (serviceId === 'virtual-machine') {
    return buildVirtualMachineCatalogSpecRows(item)
  }
  return resolveCatalogSpecRows(item)
}

export function resolveCatalogSpecRows(
  item: Pick<
    ProviderCatalogDraft,
    | 'serviceId'
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeId'
    | 'instanceTypeLabel'
    | 'diskImageLabel'
    | 'diskImageId'
    | 'clusterVersionMode'
    | 'nodeSetId'
    | 'nodeSetLabel'
    | 'hostTypeId'
    | 'hostTypeLabel'
    | 'clusterNodeTopologyMode'
    | 'clusterTopology'
    | 'addonOperators'
    | 'addonOperatorsMode'
    | 'hardwareOsMode'
    | 'osImageMode'
  >,
  options?: { includeDetails?: boolean },
): CatalogSpecRow[] {
  const serviceId = getDraftServiceId(item)

  if (serviceId === 'cluster') {
    return buildClusterCatalogSpecRows(item, options)
  }

  if (serviceId === 'baremetal') {
    return buildBaremetalCatalogSpecRows(item)
  }

  if (serviceId === 'virtual-machine') {
    return buildVirtualMachineCatalogSpecRows(item, options)
  }

  if (item.instanceTypeLabel || item.diskImageLabel) {
    const rows: CatalogSpecRow[] = []

    if (item.instanceTypeLabel) {
      rows.push({ label: 'Instance type', value: item.instanceTypeLabel })
    }
    if (item.diskImageLabel) {
      rows.push({ label: 'OS image', value: item.diskImageLabel })
    }

    return rows
  }

  const hardware = resolveHardwareSpecsForCatalogItem(item)
  return [
    { label: 'CPU', value: hardware.cpu },
    { label: 'RAM', value: hardware.ram },
    { label: 'GPU', value: hardware.gpu },
    { label: 'OS image', value: hardware.osImage },
  ]
}

export function formatCatalogConfigurationSummary(
  item: Pick<
    ProviderCatalogDraft,
    | 'serviceId'
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeLabel'
    | 'diskImageLabel'
    | 'diskImageId'
    | 'clusterVersionMode'
    | 'nodeSetId'
    | 'nodeSetLabel'
    | 'hostTypeId'
    | 'hostTypeLabel'
    | 'clusterNodeTopologyMode'
    | 'clusterTopology'
    | 'hardwareOsMode'
    | 'osImageMode'
  >,
): string {
  return resolveCatalogCardSpecRows(item)
    .map((row) => (row.badge ? `${row.value} (${row.badge.text})` : row.value))
    .join(' · ')
}

export function getCatalogSpecsSectionLabel(serviceId: CatalogServiceId): string {
  if (serviceId === 'cluster') {
    return 'Cluster configuration'
  }
  if (serviceId === 'models') {
    return 'Model configuration'
  }
  if (serviceId === 'virtual-machine') {
    return 'Instance configuration'
  }
  return 'Hardware & OS'
}

export function getCatalogProfileFieldLabel(serviceId: CatalogServiceId): string {
  if (serviceId === 'models') {
    return 'Model profile'
  }
  return 'Linked template'
}
