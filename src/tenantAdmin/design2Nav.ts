import { tenantAdminNavDesign2 } from '../navCompare/navData'
import type { TenantAdminNavId, TenantAdminNavItem } from './constants'

/** Design 2 Navigation structure leaf → workspace nav id. */
const DESIGN2_LEAF_TO_WORKSPACE: Record<string, TenantAdminNavId> = {
  overview: 'overview',
  catalog: 'catalog',
  'bare-metal': 'services-baremetal',
  clusters: 'services-clusters',
  models: 'services-models',
  'virtual-machines': 'services-virtual-machines',
  projects: 'projects-teams',
  volumes: 'storage-volumes',
  'virtual-networks': 'networking-virtual-networks',
  subnets: 'networking-subnets',
  'security-groups': 'networking-security-groups',
  'external-ips': 'networking-external-ip-pools',
  roles: 'administration-roles',
  'service-accounts': 'administration-service-accounts',
  'identity-provider': 'administration-identity-providers',
  secrets: 'secrets',
  'activity-log': 'administration-activity-log',
}

/** Sidebar items for Design 2, aligned with Navigation structure — Tenant Admin. */
export function getTenantAdminDesign2NavItems(): TenantAdminNavItem[] {
  return tenantAdminNavDesign2.nav.map((row) => {
    if (row.kind === 'link') {
      return {
        id: DESIGN2_LEAF_TO_WORKSPACE[row.id] ?? 'overview',
        label: row.label,
      }
    }

    return {
      id: row.groupId,
      label: row.label,
      children: row.children.map((child) => ({
        id: DESIGN2_LEAF_TO_WORKSPACE[child.id] ?? 'overview',
        label: child.label,
      })),
    }
  })
}

export const TENANT_ADMIN_DESIGN2_DEFAULT_EXPANDED = tenantAdminNavDesign2.defaultExpanded

export function isTenantAdminDesign2PlaceholderNavId(navId: TenantAdminNavId): boolean {
  return (
    navId === 'networking-subnets' ||
    navId === 'networking-security-groups' ||
    navId === 'administration-activity-log'
  )
}

export function getTenantAdminDesign2PlaceholderCopy(
  navId: TenantAdminNavId,
): { title: string; description: string } | null {
  switch (navId) {
    case 'networking-subnets':
      return {
        title: 'Subnets',
        description: 'Carve virtual networks into subnets for workloads and isolation.',
      }
    case 'networking-security-groups':
      return {
        title: 'Security groups',
        description: 'Control inbound and outbound traffic rules for your instances.',
      }
    case 'administration-activity-log':
      return {
        title: 'Activity log',
        description: 'A running diary of what happened recently — who did what, and when.',
      }
    default:
      return null
  }
}
