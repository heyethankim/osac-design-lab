export type NavLink = {
  kind: 'link'
  id: string
  label: string
  /** Page blurb shown in the tooltip when this item is selected */
  description: string
}

export type NavExpand = {
  kind: 'expand'
  groupId: string
  label: string
  children: { id: string; label: string; description: string }[]
}

export type NavRow = NavLink | NavExpand

export type PersonaId =
  | 'provider-admin'
  | 'tenant-admin'
  | 'tenant-user'
  | 'idp-manager'

export type PersonaNavConfig = {
  id: PersonaId
  label: string
  activeItem: string
  defaultExpanded: string[]
  nav: NavRow[]
}

/** Provider Admin */
export const providerAdminNav: PersonaNavConfig = {
  id: 'provider-admin',
  label: 'Provider Admin',
  activeItem: 'catalog',
  defaultExpanded: ['administration', 'compute', 'storage', 'networking'],
  nav: [
    {
      kind: 'link',
      id: 'overview',
      label: 'Overview',
      description:
        'A quick pulse check on the whole platform — what’s healthy, what’s busy, and what needs a look.',
    },
    {
      kind: 'link',
      id: 'catalog',
      label: 'Catalog',
      description:
        'Build offerings from your master templates (bare metal, clusters, models, VMs) and hand them out to tenants.',
    },
    {
      kind: 'expand',
      groupId: 'administration',
      label: 'Administration',
      children: [
        {
          id: 'tenants',
          label: 'Tenants',
          description:
            'Onboard organizations, connect their IdP, keep them organized, and make sure billing is hooked up.',
        },
        {
          id: 'billing',
          label: 'Billing',
          description:
            'See how usage turns into charges across tenants — the money side of the platform.',
        },
      ],
    },
    {
      kind: 'expand',
      groupId: 'compute',
      label: 'Compute',
      children: [
        {
          id: 'instance-types',
          label: 'Instance types',
          description:
            'Define the “sizes” tenants can pick from for bare metal and virtual machines — CPUs, memory, GPUs, the works.',
        },
        {
          id: 'disk-images',
          label: 'Disk images',
          description:
            'Curate the OS and disk images people use when they spin up virtual machines.',
        },
      ],
    },
    {
      kind: 'expand',
      groupId: 'storage',
      label: 'Storage',
      children: [
        {
          id: 'backends',
          label: 'Backends',
          description:
            'Connect the actual storage systems that power volumes and images underneath.',
        },
        {
          id: 'tiers',
          label: 'Tiers',
          description:
            'Package backends into performance tiers so tenants can pick “fast” vs “cheap” without the plumbing.',
        },
      ],
    },
    {
      kind: 'expand',
      groupId: 'networking',
      label: 'Networking',
      children: [
        {
          id: 'external-ip-pools',
          label: 'External IP pools',
          description:
            'Manage the shared pools of public IPs that tenants draw from for edge access.',
        },
      ],
    },
    {
      kind: 'link',
      id: 'secrets',
      label: 'Secrets',
      description:
        'Stash credentials safely in the vault so they can be used at launch without hardcoding them.',
    },
  ],
}

/** Tenant Admin */
export const tenantAdminNav: PersonaNavConfig = {
  id: 'tenant-admin',
  label: 'Tenant Admin',
  activeItem: 'catalog',
  defaultExpanded: ['services', 'storage', 'networking', 'administration'],
  nav: [
    {
      kind: 'link',
      id: 'overview',
      label: 'Overview',
      description:
        'Your tenant at a glance — what’s running, who’s using what, and where to dig in next.',
    },
    {
      kind: 'link',
      id: 'catalog',
      label: 'Catalog',
      description:
        'Browse published offerings and launch bare metal, clusters, models, or VMs for your org.',
    },
    {
      kind: 'expand',
      groupId: 'services',
      label: 'Services',
      children: [
        {
          id: 'bare-metal',
          label: 'Bare metal',
          description: 'See and manage the bare metal machines your tenant has provisioned.',
        },
        {
          id: 'clusters',
          label: 'Clusters',
          description: 'OpenShift clusters you’ve stood up for the organization — all in one place.',
        },
        {
          id: 'models',
          label: 'Models',
          description: 'AI model serving workloads your teams have launched from the catalog.',
        },
        {
          id: 'virtual-machines',
          label: 'Virtual machines',
          description: 'Filter, open, and keep tabs on the VMs running in your tenant.',
        },
      ],
    },
    {
      kind: 'link',
      id: 'projects',
      label: 'Projects',
      description:
        'Carve work into projects so teams can share resources without stepping on each other.',
    },
    {
      kind: 'expand',
      groupId: 'storage',
      label: 'Storage',
      children: [
        {
          id: 'volumes',
          label: 'Volumes',
          description:
            'Create and manage the disks attached to your workloads. Read-only for the dev preview.',
        },
      ],
    },
    {
      kind: 'expand',
      groupId: 'networking',
      label: 'Networking',
      children: [
        {
          id: 'virtual-networks',
          label: 'Virtual networks',
          description: 'Set up private networks your compute instances can talk on.',
        },
        {
          id: 'external-ips',
          label: 'External IPs',
          description:
            'Grab public addresses from provider pools when something needs to be reachable outside.',
        },
      ],
    },
    {
      kind: 'expand',
      groupId: 'administration',
      label: 'Administration',
      children: [
        {
          id: 'roles',
          label: 'Users',
          description: 'Decide who can do what — bind people to roles across the tenant.',
        },
        {
          id: 'service-accounts',
          label: 'Service accounts',
          description:
            'Create non-human accounts for CI systems and other automation, with keys and role access.',
        },
        {
          id: 'billing',
          label: 'Billing',
          description: 'Keep an eye on usage and costs for your organization.',
        },
        {
          id: 'identity-provider',
          label: 'Identity provider',
          description:
            'Plug in how people sign in — connect your IdP so the right folks get access.',
        },
      ],
    },
    {
      kind: 'link',
      id: 'secrets',
      label: 'Secrets',
      description:
        'Store launch credentials in the vault so they’re encrypted and ready when you need them.',
    },
  ],
}

/** Tenant User */
export const tenantUserNav: PersonaNavConfig = {
  id: 'tenant-user',
  label: 'Tenant User',
  activeItem: 'catalog',
  defaultExpanded: ['services', 'networking'],
  nav: [
    {
      kind: 'link',
      id: 'overview',
      label: 'Overview',
      description:
        'Your personal dashboard — a short tour of what you’ve got running and what’s available.',
    },
    {
      kind: 'link',
      id: 'catalog',
      label: 'Catalog',
      description:
        'Pick a published offering and launch bare metal, a cluster, a model, or a VM.',
    },
    {
      kind: 'expand',
      groupId: 'services',
      label: 'Services',
      children: [
        {
          id: 'bare-metal',
          label: 'Bare metal',
          description: 'The bare metal instances you own or can work with.',
        },
        {
          id: 'clusters',
          label: 'Clusters',
          description: 'Clusters you’ve provisioned or been given access to.',
        },
        {
          id: 'models',
          label: 'Models',
          description: 'Model deployments you’ve launched for AI workloads.',
        },
        {
          id: 'virtual-machines',
          label: 'Virtual machines',
          description: 'Your VMs — start, stop, and peek at what’s running.',
        },
      ],
    },
    {
      kind: 'link',
      id: 'projects',
      label: 'Projects',
      description: 'Jump into the projects you’re part of to find shared resources.',
    },
    {
      kind: 'expand',
      groupId: 'networking',
      label: 'Networking',
      children: [
        {
          id: 'virtual-networks',
          label: 'Virtual networks',
          description: 'Networks your instances use to talk to each other privately.',
        },
        {
          id: 'external-ips',
          label: 'External IPs',
          description: 'Public IPs you’ve allocated when something needs outside reach.',
        },
      ],
    },
    {
      kind: 'link',
      id: 'secrets',
      label: 'Secrets',
      description: 'Keep passwords and keys in the vault for use when you launch things.',
    },
    {
      kind: 'link',
      id: 'activity-log',
      label: 'Activity log',
      description: 'A running diary of what happened recently — who did what, and when.',
    },
  ],
}

/** IdP Manager */
export const idpManagerNav: PersonaNavConfig = {
  id: 'idp-manager',
  label: 'IdP Manager',
  activeItem: 'identity-provider',
  defaultExpanded: [],
  nav: [
    {
      kind: 'link',
      id: 'identity-provider',
      label: 'Identity provider',
      description:
        'Plug in how people sign in — connect your IdP so the right folks get access.',
    },
    {
      kind: 'link',
      id: 'roles',
      label: 'Roles',
      description: 'Decide who can do what — bind people to roles across the tenant.',
    },
  ],
}

export const personasInOrder: PersonaNavConfig[] = [
  providerAdminNav,
  tenantAdminNav,
  tenantUserNav,
  idpManagerNav,
]
