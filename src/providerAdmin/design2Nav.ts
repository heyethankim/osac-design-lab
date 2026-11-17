import { providerAdminNavDesign2 } from '../navCompare/navData'
import type { ProviderAdminNavId } from './constants'

/** Design 2 Navigation structure leaf → workspace nav id. */
const DESIGN2_LEAF_TO_WORKSPACE: Record<string, ProviderAdminNavId> = {
  overview: 'overview',
  'catalog-items': 'catalog',
  'instance-types': 'catalog-instance-types',
  'disk-images': 'catalog-disk-images',
  tenants: 'administration-organizations',
  secrets: 'secrets',
  backends: 'storage-backends',
  tiers: 'storage-tiers',
  'external-ip-pools': 'networking',
  'network-class': 'networking-network-class',
}

export type ProviderAdminDesign2NavRow =
  | { kind: 'link'; id: ProviderAdminNavId; label: string }
  | {
      kind: 'expand'
      groupId: string
      label: string
      children: { id: ProviderAdminNavId; label: string }[]
    }

/** Sidebar rows for Design 2, aligned with Navigation structure. */
export function getProviderAdminDesign2NavRows(): ProviderAdminDesign2NavRow[] {
  return providerAdminNavDesign2.nav.map((row) => {
    if (row.kind === 'link') {
      return {
        kind: 'link',
        id: DESIGN2_LEAF_TO_WORKSPACE[row.id] ?? 'overview',
        label: row.label,
      }
    }

    return {
      kind: 'expand',
      groupId: row.groupId,
      label: row.label,
      children: row.children.map((child) => ({
        id: DESIGN2_LEAF_TO_WORKSPACE[child.id] ?? 'overview',
        label: child.label,
      })),
    }
  })
}

export const PROVIDER_ADMIN_DESIGN2_DEFAULT_EXPANDED = providerAdminNavDesign2.defaultExpanded

export function isCatalogDesign2NavId(navId: ProviderAdminNavId): boolean {
  return (
    navId === 'catalog' ||
    navId === 'catalog-instance-types' ||
    navId === 'catalog-disk-images'
  )
}

export function isStorageDesign2NavId(navId: ProviderAdminNavId): boolean {
  return navId === 'storage-backends' || navId === 'storage-tiers'
}

export function isAdministrationDesign2NavId(navId: ProviderAdminNavId): boolean {
  return navId === 'administration-organizations' || navId === 'secrets'
}

export function isNetworkingDesign2NavId(navId: ProviderAdminNavId): boolean {
  return navId === 'networking' || navId === 'networking-network-class'
}

export function isDesign2PlaceholderNavId(navId: ProviderAdminNavId): boolean {
  return (
    navId === 'catalog-instance-types' ||
    navId === 'catalog-disk-images' ||
    navId === 'storage-backends' ||
    navId === 'storage-tiers' ||
    navId === 'networking-network-class'
  )
}

export function getDesign2PlaceholderCopy(
  navId: ProviderAdminNavId,
): { title: string; description: string } | null {
  switch (navId) {
    case 'catalog-instance-types':
      return {
        title: 'Instance types',
        description:
          'Define the sizes tenants can pick from for bare metal and virtual machines — CPUs, memory, GPUs, and more.',
      }
    case 'catalog-disk-images':
      return {
        title: 'Disk images',
        description:
          'Curate the OS and disk images people use when they spin up virtual machines.',
      }
    case 'storage-backends':
      return {
        title: 'Backends',
        description:
          'Connect the storage systems that power volumes and images underneath.',
      }
    case 'storage-tiers':
      return {
        title: 'Tiers',
        description:
          'Package backends into performance tiers so tenants can pick fast vs cheap without the plumbing.',
      }
    case 'networking-network-class':
      return {
        title: 'Network class',
        description:
          'Define network classes tenants can choose when they create virtual networks.',
      }
    default:
      return null
  }
}
