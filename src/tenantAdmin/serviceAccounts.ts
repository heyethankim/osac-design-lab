import { DEMO_TENANT_ROOT_PROJECT_ID } from './projects'
import { getTenantProjects } from './storage'
import {
  addTenantSecret,
  buildTenantSecretData,
  deleteTenantSecret,
  ensureTenantDemoSecrets,
  getSecretById,
  type TenantSecret,
} from '../tenant/secrets'
import {
  isValidKubernetesResourceName,
  KUBERNETES_RESOURCE_NAME_MAX_LENGTH,
} from '../shared/kubernetesResourceName'

export const TENANT_SERVICE_ACCOUNTS_DEMO = {
  title: 'Service accounts',
  lede: 'Create non-human accounts for CI systems and other automation.',
  createLabel: 'Create service account',
  emptyTitle: 'No service accounts yet',
  emptyBody: 'Create one for a tool or pipeline that needs access.',
  emptyFilteredTitle: 'No service accounts match your filters',
  emptyFilteredBody: 'Try a different project or search term, or clear filters.',
  createKeyLabel: 'Create key',
  bindRoleLabel: 'Grant role',
  keysSectionHelp: 'Keys authenticate as this account.',
  rolesSectionHelp: 'Grant a tenant role so this account can access resources.',
  credentialsSectionHelp:
    'Each service account has one client ID and client secret for authentication.',
  viewClientIdLabel: 'View Client ID',
  viewCredentialsLabel: 'View Credentials',
  regenerateSecretLabel: 'Regenerate Secret',
  assignRolesLabel: 'Assign Roles',
  noPermissionsOnCreateHelp:
    'Starts with no access. Assign roles in Permissions after creation.',
  roleGrantsZeroAccessHelp:
    'A service account with no assigned roles cannot perform any actions. You can grant roles now or assign them later under Permissions.',
  nameImmutableHelp: 'Service account name cannot be modified after creation.',
} as const

/** Design 2 service account roles: Tenant Admin, Tenant Automation, Tenant IdP Manager. */
export const SERVICE_ACCOUNT_ASSIGNABLE_ROLES = [
  {
    id: 'tenant-administrator' as const,
    label: 'Tenant Admin',
    description: 'Full administrative access to all resources within a tenant.',
    color: 'purple' as const,
  },
  {
    id: 'tenant-automation' as const,
    label: 'Tenant Automation',
    description: 'Automation access for CI systems and non-human workloads within a tenant.',
    color: 'teal' as const,
  },
  {
    id: 'tenant-idp-manager' as const,
    label: 'Tenant IdP Manager',
    description: 'Manage identity provider configuration for the tenant.',
    color: 'blue' as const,
  },
] as const

export type ServiceAccountAssignableRoleId =
  (typeof SERVICE_ACCOUNT_ASSIGNABLE_ROLES)[number]['id']

/** Design 2 display labels for role grants. */
export const SERVICE_ACCOUNT_DESIGN2_ROLE_LABELS: Record<ServiceAccountAssignableRoleId, string> = {
  'tenant-administrator': 'Tenant Admin',
  'tenant-automation': 'Tenant Automation',
  'tenant-idp-manager': 'Tenant IdP Manager',
}

/** Legacy role id from earlier prototypes; treated as Tenant Automation. */
const LEGACY_TENANT_USER_ROLE_ID = 'tenant-user'

export function isServiceAccountAssignableRoleId(
  value: unknown,
): value is ServiceAccountAssignableRoleId {
  return (
    value === 'tenant-administrator' ||
    value === 'tenant-automation' ||
    value === 'tenant-idp-manager'
  )
}

function normalizeAssignableRoleId(value: unknown): ServiceAccountAssignableRoleId | null {
  if (value === LEGACY_TENANT_USER_ROLE_ID) {
    return 'tenant-automation'
  }
  return isServiceAccountAssignableRoleId(value) ? value : null
}

export function getServiceAccountAssignableRole(
  roleId: ServiceAccountAssignableRoleId,
): (typeof SERVICE_ACCOUNT_ASSIGNABLE_ROLES)[number] {
  return (
    SERVICE_ACCOUNT_ASSIGNABLE_ROLES.find((role) => role.id === roleId) ??
    SERVICE_ACCOUNT_ASSIGNABLE_ROLES[0]
  )
}

export function listServiceAccountAssignableRoleBindings(
  account: TenantServiceAccount,
): ServiceAccountRoleBinding[] {
  return account.roleBindings.filter((binding) =>
    isServiceAccountAssignableRoleId(binding.roleId),
  )
}

export type ServiceAccountStatus = 'active' | 'suspended' | 'deleting'

export type ServiceAccountRoleBinding = {
  id: string
  roleId: ServiceAccountAssignableRoleId
  createdAt: string
}

export type TenantServiceAccount = {
  id: string
  name: string
  description: string
  /** Always project-scoped (OCP/K8s namespace equivalent). Design 2 keeps root only. */
  projectId: string
  projectName: string
  createdAt: string
  labels: string[]
  /** Token secrets in the tenant vault linked to this service account. */
  tokenSecretIds: string[]
  /** RoleBindings granting this SA access (managed separately from the identity). */
  roleBindings: ServiceAccountRoleBinding[]
  /** Lifecycle status (Design 2). Missing values are treated as active. */
  status?: ServiceAccountStatus
  /** Design 2: when status became deleting; used to finish cleanup after a delay. */
  deletingStartedAt?: string
}

/** Design 2: how long an account stays Deleting before it is removed. */
export const SERVICE_ACCOUNT_DELETE_CLEANUP_MS = 4000

export type ServiceAccountsDesignVariant = '1' | '2'

export type ServiceAccountProjectFilter = 'all' | string

const STORAGE_KEY_PREFIX = 'bmaas-tenant-service-accounts-v2-'

export const DEMO_CI_PIPELINE_SERVICE_ACCOUNT_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
export const DEMO_OBSERVABILITY_SERVICE_ACCOUNT_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
export const DEMO_CI_PIPELINE_TOKEN_SECRET_ID = 'demo-sa-token-ci-pipeline'
export const DEMO_OBSERVABILITY_TOKEN_SECRET_ID = 'demo-sa-token-observability'

const SERVICE_ACCOUNT_SECRET_LABEL = 'service-account'
const SERVICE_ACCOUNT_NAME_LABEL_PREFIX = 'kubernetes.io/service-account.name='

function getStorageKey(tenantSlug: string): string {
  return `${STORAGE_KEY_PREFIX}${tenantSlug}`
}

function isRoleBinding(value: unknown): value is ServiceAccountRoleBinding {
  if (!value || typeof value !== 'object') {
    return false
  }
  const entry = value as ServiceAccountRoleBinding
  return (
    typeof entry.id === 'string' &&
    normalizeAssignableRoleId(entry.roleId) !== null &&
    typeof entry.createdAt === 'string'
  )
}

function normalizeRoleBindings(value: unknown): ServiceAccountRoleBinding[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((entry) => {
    if (!isRoleBinding(entry)) {
      return []
    }
    const roleId = normalizeAssignableRoleId(entry.roleId)
    if (!roleId) {
      return []
    }
    return [{ ...entry, roleId }]
  })
}

function isServiceAccountStatus(value: unknown): value is ServiceAccountStatus {
  return value === 'active' || value === 'suspended' || value === 'deleting'
}

function isTenantServiceAccount(value: unknown): value is TenantServiceAccount {
  if (!value || typeof value !== 'object') {
    return false
  }

  const entry = value as TenantServiceAccount
  return (
    typeof entry.id === 'string' &&
    typeof entry.name === 'string' &&
    typeof entry.description === 'string' &&
    typeof entry.projectId === 'string' &&
    typeof entry.projectName === 'string' &&
    typeof entry.createdAt === 'string' &&
    Array.isArray(entry.labels) &&
    entry.labels.every((label) => typeof label === 'string') &&
    Array.isArray(entry.tokenSecretIds) &&
    entry.tokenSecretIds.every((id) => typeof id === 'string') &&
    Array.isArray(entry.roleBindings) &&
    (entry.status === undefined || isServiceAccountStatus(entry.status)) &&
    (entry.deletingStartedAt === undefined || typeof entry.deletingStartedAt === 'string')
  )
}

function normalizeTenantServiceAccount(entry: TenantServiceAccount): TenantServiceAccount {
  return {
    ...entry,
    roleBindings: normalizeRoleBindings(entry.roleBindings),
    deletingStartedAt:
      typeof entry.deletingStartedAt === 'string' ? entry.deletingStartedAt : undefined,
  }
}

export function getServiceAccountStatus(account: TenantServiceAccount): ServiceAccountStatus {
  return account.status ?? 'active'
}

export function getServiceAccountStatusLabel(status: ServiceAccountStatus): string {
  switch (status) {
    case 'suspended':
      return 'Suspended'
    case 'deleting':
      return 'Deleting'
    case 'active':
    default:
      return 'Active'
  }
}

export function getServiceAccountStatusColor(
  status: ServiceAccountStatus,
): 'green' | 'orange' | 'grey' {
  switch (status) {
    case 'suspended':
      return 'orange'
    case 'deleting':
      return 'grey'
    case 'active':
    default:
      return 'green'
  }
}

/**
 * Design 2 public client identifier.
 * Format: osac-sa-&lt;tenant-id&gt;-&lt;account-UUID&gt;
 */
export function buildServiceAccountClientId(tenantSlug: string, accountId: string): string {
  return `osac-sa-${tenantSlug}-${accountId}`
}

export const SERVICE_ACCOUNT_CLIENT_ID_PENDING_LABEL = 'Generated automatically'

function readStoredAccounts(tenantSlug: string): TenantServiceAccount[] | null {
  try {
    const raw = window.localStorage.getItem(getStorageKey(tenantSlug))
    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return null
    }

    return parsed.filter(isTenantServiceAccount).map(normalizeTenantServiceAccount)
  } catch {
    return null
  }
}

function writeStoredAccounts(tenantSlug: string, accounts: readonly TenantServiceAccount[]): void {
  window.localStorage.setItem(getStorageKey(tenantSlug), JSON.stringify(accounts))
}

function createSecretToken(): string {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return `osa_sa_${random}`
}

function serviceAccountNameLabel(name: string): string {
  return `${SERVICE_ACCOUNT_NAME_LABEL_PREFIX}${name}`
}

function buildTokenSecret(input: {
  id: string
  accountName: string
  projectId: string
  token: string
  createdAt: string
}): TenantSecret {
  return {
    id: input.id,
    name: `${input.accountName}-token`,
    type: 'single-value',
    usage: 'general',
    createdAt: input.createdAt,
    summary: `API token for service account ${input.accountName}`,
    description: `Token secret for service account ${input.accountName}`,
    labels: [SERVICE_ACCOUNT_SECRET_LABEL, serviceAccountNameLabel(input.accountName)],
    projectId: input.projectId,
    data: buildTenantSecretData('single-value', [{ key: 'token', value: input.token }]),
  }
}

function ensureDemoTokenSecrets(tenantSlug: string): void {
  ensureTenantDemoSecrets(tenantSlug)

  const demos = [
    {
      id: DEMO_CI_PIPELINE_TOKEN_SECRET_ID,
      accountName: 'ci-pipeline',
      token: 'osa_sa_demo_ci_pipeline_token_7f3a91c2e8b04d6a',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    },
    {
      id: DEMO_OBSERVABILITY_TOKEN_SECRET_ID,
      accountName: 'observability-exporter',
      token: 'osa_sa_demo_observability_token_b2c9e14f0a775d31',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
  ] as const

  for (const demo of demos) {
    if (getSecretById('tenant', tenantSlug, demo.id)) {
      continue
    }
    addTenantSecret(
      tenantSlug,
      buildTokenSecret({
        id: demo.id,
        accountName: demo.accountName,
        projectId: DEMO_TENANT_ROOT_PROJECT_ID,
        token: demo.token,
        createdAt: demo.createdAt,
      }),
    )
  }
}

function buildDemoServiceAccounts(tenantSlug: string): TenantServiceAccount[] {
  const projects = getTenantProjects(tenantSlug)
  const rootProject =
    projects.find((project) => project.id === DEMO_TENANT_ROOT_PROJECT_ID) ?? projects[0]
  if (!rootProject) {
    return []
  }

  ensureDemoTokenSecrets(tenantSlug)
  const now = Date.now()

  return [
    {
      id: DEMO_CI_PIPELINE_SERVICE_ACCOUNT_ID,
      name: 'ci-pipeline',
      description: 'GitHub Actions and Tekton jobs that call the API.',
      projectId: rootProject.id,
      projectName: rootProject.name,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 12).toISOString(),
      labels: ['ci'],
      tokenSecretIds: [DEMO_CI_PIPELINE_TOKEN_SECRET_ID],
      roleBindings: [
        {
          id: 'binding-ci-tenant-automation',
          roleId: 'tenant-automation',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 12).toISOString(),
        },
      ],
      status: 'active',
    },
    {
      id: DEMO_OBSERVABILITY_SERVICE_ACCOUNT_ID,
      name: 'observability-exporter',
      description: 'Read-only metrics and inventory export for the observability stack.',
      projectId: rootProject.id,
      projectName: rootProject.name,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
      labels: ['observability'],
      tokenSecretIds: [DEMO_OBSERVABILITY_TOKEN_SECRET_ID],
      roleBindings: [
        {
          id: 'binding-obs-tenant-automation',
          roleId: 'tenant-automation',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
        },
      ],
      status: 'active',
    },
  ]
}

export function ensureTenantDemoServiceAccounts(tenantSlug: string): TenantServiceAccount[] {
  const existing = readStoredAccounts(tenantSlug)
  if (existing) {
    ensureDemoTokenSecrets(tenantSlug)
    return sortServiceAccounts(existing)
  }

  const seeded = buildDemoServiceAccounts(tenantSlug)
  writeStoredAccounts(tenantSlug, seeded)
  return sortServiceAccounts(seeded)
}

export function listTenantServiceAccounts(tenantSlug: string): TenantServiceAccount[] {
  return ensureTenantDemoServiceAccounts(tenantSlug)
}

export function getTenantServiceAccountById(
  tenantSlug: string,
  id: string,
): TenantServiceAccount | null {
  return listTenantServiceAccounts(tenantSlug).find((account) => account.id === id) ?? null
}

export function isServiceAccountNameTaken(
  tenantSlug: string,
  name: string,
  projectId: string,
  excludeId?: string,
): boolean {
  const normalized = name.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  return listTenantServiceAccounts(tenantSlug).some(
    (account) =>
      account.id !== excludeId &&
      account.projectId === projectId &&
      account.name.trim().toLowerCase() === normalized,
  )
}

export function validateServiceAccountName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) {
    return 'Enter a name.'
  }
  if (trimmed.length > KUBERNETES_RESOURCE_NAME_MAX_LENGTH) {
    return `At most ${KUBERNETES_RESOURCE_NAME_MAX_LENGTH} characters.`
  }
  if (!isValidKubernetesResourceName(trimmed)) {
    return 'Use lowercase letters, numbers, and hyphens.'
  }
  return null
}

export type CreateTenantServiceAccountInput = {
  name: string
  description: string
  projectId: string
  projectName: string
  labels?: string[]
  roleIds?: readonly ServiceAccountAssignableRoleId[]
  status?: ServiceAccountStatus
  /** Design 2: issue the single client secret at create time. */
  issueCredential?: boolean
}

export function createTenantServiceAccount(
  tenantSlug: string,
  input: CreateTenantServiceAccountInput,
): TenantServiceAccount | null {
  const name = input.name.trim().toLowerCase()
  if (
    validateServiceAccountName(name) ||
    !input.projectId ||
    isServiceAccountNameTaken(tenantSlug, name, input.projectId)
  ) {
    return null
  }

  const createdAt = new Date().toISOString()
  const roleBindings: ServiceAccountRoleBinding[] = (input.roleIds ?? []).map((roleId, index) => ({
    id: `binding-${Date.now().toString(36)}-${index}`,
    roleId,
    createdAt,
  }))

  const account: TenantServiceAccount = {
    id: crypto.randomUUID(),
    name,
    description: input.description.trim(),
    projectId: input.projectId,
    projectName: input.projectName,
    createdAt,
    labels: (input.labels ?? []).map((label) => label.trim()).filter(Boolean),
    tokenSecretIds: [],
    roleBindings,
    status: input.status ?? 'active',
  }

  const next = sortServiceAccounts([...listTenantServiceAccounts(tenantSlug), account])
  writeStoredAccounts(tenantSlug, next)

  if (input.issueCredential) {
    const withCredential = createServiceAccountToken(tenantSlug, account.id)
    return withCredential?.account ?? account
  }

  return account
}

export type UpdateTenantServiceAccountInput = {
  name: string
  description: string
  projectId: string
  projectName: string
  labels?: string[]
  /** When true, keep the existing name (Design 2 immutable name). */
  preserveName?: boolean
  roleIds?: readonly ServiceAccountAssignableRoleId[]
}

export function updateTenantServiceAccount(
  tenantSlug: string,
  id: string,
  input: UpdateTenantServiceAccountInput,
): TenantServiceAccount | null {
  const current = listTenantServiceAccounts(tenantSlug)
  const index = current.findIndex((account) => account.id === id)
  if (index < 0) {
    return null
  }

  const existing = current[index]!
  const name = input.preserveName ? existing.name : input.name.trim().toLowerCase()
  if (
    validateServiceAccountName(name) ||
    !input.projectId ||
    (!input.preserveName && isServiceAccountNameTaken(tenantSlug, name, input.projectId, id))
  ) {
    return null
  }

  const roleBindings =
    input.roleIds !== undefined
      ? input.roleIds
          .filter(isServiceAccountAssignableRoleId)
          .map((roleId, roleIndex) => {
            const existingBinding = listServiceAccountAssignableRoleBindings(existing).find(
              (binding) => binding.roleId === roleId,
            )
            return (
              existingBinding ?? {
                id: `binding-${Date.now().toString(36)}-${roleIndex}`,
                roleId,
                createdAt: new Date().toISOString(),
              }
            )
          })
      : listServiceAccountAssignableRoleBindings(existing)

  const updated: TenantServiceAccount = {
    ...existing,
    name,
    description: input.description.trim(),
    projectId: input.projectId,
    projectName: input.projectName,
    labels:
      input.labels !== undefined
        ? input.labels.map((label) => label.trim()).filter(Boolean)
        : existing.labels,
    roleBindings,
  }
  const next = [...current]
  next[index] = updated
  const sorted = sortServiceAccounts(next)
  writeStoredAccounts(tenantSlug, sorted)
  return updated
}

export function deleteTenantServiceAccount(tenantSlug: string, id: string): TenantServiceAccount[] {
  const account = getTenantServiceAccountById(tenantSlug, id)
  if (account) {
    for (const secretId of account.tokenSecretIds) {
      deleteTenantSecret(tenantSlug, secretId)
    }
  }

  const next = listTenantServiceAccounts(tenantSlug).filter((entry) => entry.id !== id)
  writeStoredAccounts(tenantSlug, next)
  return next
}

/** Design 2: mark deleting instead of hard-removing (cleanup finishes after a short delay). */
export function markTenantServiceAccountDeleting(
  tenantSlug: string,
  id: string,
): TenantServiceAccount[] {
  const startedAt = new Date().toISOString()
  const current = listTenantServiceAccounts(tenantSlug)
  const next = current.map((account) =>
    account.id === id
      ? { ...account, status: 'deleting' as const, deletingStartedAt: startedAt }
      : account,
  )
  writeStoredAccounts(tenantSlug, sortServiceAccounts(next))
  return listTenantServiceAccounts(tenantSlug)
}

/** Milliseconds until a deleting account should be purged; 0 if already due. */
export function getServiceAccountDeletionRemainingMs(
  account: TenantServiceAccount,
  nowMs: number = Date.now(),
): number | null {
  if (getServiceAccountStatus(account) !== 'deleting') {
    return null
  }
  const startedMs = account.deletingStartedAt ? Date.parse(account.deletingStartedAt) : Number.NaN
  if (!Number.isFinite(startedMs)) {
    return 0
  }
  return Math.max(0, SERVICE_ACCOUNT_DELETE_CLEANUP_MS - (nowMs - startedMs))
}

/**
 * Design 2: hard-remove accounts whose deleting cleanup window has elapsed.
 * Returns the refreshed list (and whether anything was removed).
 */
export function finalizeCompletedServiceAccountDeletions(
  tenantSlug: string,
  nowMs: number = Date.now(),
): { accounts: TenantServiceAccount[]; removedIds: string[] } {
  const current = listTenantServiceAccounts(tenantSlug)
  const removedIds: string[] = []
  const remaining: TenantServiceAccount[] = []

  for (const account of current) {
    const remainingMs = getServiceAccountDeletionRemainingMs(account, nowMs)
    if (remainingMs === null) {
      remaining.push(account)
      continue
    }
    if (remainingMs > 0) {
      remaining.push(account)
      continue
    }
    for (const secretId of account.tokenSecretIds) {
      deleteTenantSecret(tenantSlug, secretId)
    }
    removedIds.push(account.id)
  }

  if (removedIds.length > 0) {
    writeStoredAccounts(tenantSlug, sortServiceAccounts(remaining))
  }

  return {
    accounts: listTenantServiceAccounts(tenantSlug),
    removedIds,
  }
}

function replaceAccount(
  tenantSlug: string,
  account: TenantServiceAccount,
): TenantServiceAccount {
  const current = listTenantServiceAccounts(tenantSlug)
  const next = current.map((entry) => (entry.id === account.id ? account : entry))
  writeStoredAccounts(tenantSlug, sortServiceAccounts(next))
  return account
}

export function createServiceAccountToken(
  tenantSlug: string,
  accountId: string,
): { account: TenantServiceAccount; secret: TenantSecret; token: string } | null {
  const account = getTenantServiceAccountById(tenantSlug, accountId)
  if (!account) {
    return null
  }

  const token = createSecretToken()
  const createdAt = new Date().toISOString()
  const secret = buildTokenSecret({
    id: `sa-token-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    accountName: account.name,
    projectId: account.projectId,
    token,
    createdAt,
  })
  addTenantSecret(tenantSlug, secret)

  const updated = replaceAccount(tenantSlug, {
    ...account,
    tokenSecretIds: [...account.tokenSecretIds, secret.id],
  })

  return { account: updated, secret, token }
}

/**
 * Design 2 single-credential model: revoke the active secret and issue a new one
 * (ServiceAccounts/RegenerateSecret).
 */
export function regenerateServiceAccountSecret(
  tenantSlug: string,
  accountId: string,
): {
  account: TenantServiceAccount
  secret: TenantSecret
  clientId: string
  clientSecret: string
} | null {
  const account = getTenantServiceAccountById(tenantSlug, accountId)
  if (!account || getServiceAccountStatus(account) === 'deleting') {
    return null
  }

  for (const secretId of account.tokenSecretIds) {
    deleteTenantSecret(tenantSlug, secretId)
  }

  const clientSecret = createSecretToken()
  const createdAt = new Date().toISOString()
  const secret = buildTokenSecret({
    id: `sa-token-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    accountName: account.name,
    projectId: account.projectId,
    token: clientSecret,
    createdAt,
  })
  addTenantSecret(tenantSlug, secret)

  const updated = replaceAccount(tenantSlug, {
    ...account,
    tokenSecretIds: [secret.id],
  })

  return {
    account: updated,
    secret,
    clientId: buildServiceAccountClientId(tenantSlug, account.id),
    clientSecret,
  }
}

/** Ensure Design 2 accounts have exactly one credential secret. */
export function ensureServiceAccountSingleCredential(
  tenantSlug: string,
  accountId: string,
): TenantServiceAccount | null {
  const account = getTenantServiceAccountById(tenantSlug, accountId)
  if (!account) {
    return null
  }
  if (account.tokenSecretIds.length === 1) {
    return account
  }
  if (account.tokenSecretIds.length === 0) {
    const created = createServiceAccountToken(tenantSlug, accountId)
    return created?.account ?? null
  }

  const [keepId, ...extras] = account.tokenSecretIds
  for (const secretId of extras) {
    deleteTenantSecret(tenantSlug, secretId)
  }
  return replaceAccount(tenantSlug, {
    ...account,
    tokenSecretIds: keepId ? [keepId] : [],
  })
}

export function deleteServiceAccountToken(
  tenantSlug: string,
  accountId: string,
  secretId: string,
): TenantServiceAccount | null {
  const account = getTenantServiceAccountById(tenantSlug, accountId)
  if (!account) {
    return null
  }

  deleteTenantSecret(tenantSlug, secretId)
  return replaceAccount(tenantSlug, {
    ...account,
    tokenSecretIds: account.tokenSecretIds.filter((id) => id !== secretId),
  })
}

export function listServiceAccountTokenSecrets(
  tenantSlug: string,
  account: TenantServiceAccount,
): TenantSecret[] {
  ensureTenantDemoSecrets(tenantSlug)
  return account.tokenSecretIds
    .map((id) => getSecretById('tenant', tenantSlug, id))
    .filter((secret): secret is TenantSecret => Boolean(secret))
}

export function getServiceAccountTokenValue(secret: TenantSecret): string {
  return (
    secret.data.pairs.find((pair) => pair.key === 'token')?.value ??
    secret.data.pairs.find((pair) => pair.key === 'value')?.value ??
    secret.data.pairs[0]?.value ??
    ''
  )
}

export function bindServiceAccountRole(
  tenantSlug: string,
  accountId: string,
  roleId: ServiceAccountAssignableRoleId,
): TenantServiceAccount | null {
  const account = getTenantServiceAccountById(tenantSlug, accountId)
  if (!account || !isServiceAccountAssignableRoleId(roleId)) {
    return null
  }

  if (account.roleBindings.some((binding) => binding.roleId === roleId)) {
    return account
  }

  return replaceAccount(tenantSlug, {
    ...account,
    roleBindings: [
      ...listServiceAccountAssignableRoleBindings(account),
      {
        id: `binding-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        roleId,
        createdAt: new Date().toISOString(),
      },
    ],
  })
}

export function unbindServiceAccountRole(
  tenantSlug: string,
  accountId: string,
  bindingId: string,
): TenantServiceAccount | null {
  const account = getTenantServiceAccountById(tenantSlug, accountId)
  if (!account) {
    return null
  }

  return replaceAccount(tenantSlug, {
    ...account,
    roleBindings: account.roleBindings.filter((binding) => binding.id !== bindingId),
  })
}

function compareServiceAccounts(
  left: TenantServiceAccount,
  right: TenantServiceAccount,
): number {
  return right.createdAt.localeCompare(left.createdAt)
}

export function sortServiceAccounts(
  accounts: readonly TenantServiceAccount[],
): TenantServiceAccount[] {
  return [...accounts].sort(compareServiceAccounts)
}

export function formatServiceAccountCreatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatServiceAccountCreatedAtLong(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getServiceAccountRoleLabel(roleId: ServiceAccountAssignableRoleId): string {
  return (
    SERVICE_ACCOUNT_ASSIGNABLE_ROLES.find((role) => role.id === roleId)?.label ??
    SERVICE_ACCOUNT_DESIGN2_ROLE_LABELS[roleId]
  )
}

/** Synthetic principal id for service account role assignment rows. */
export function getServiceAccountPrincipalEmail(account: TenantServiceAccount): string {
  return `serviceAccount:${account.name}@${account.projectName}`
}

export type ServiceAccountRoleAssignmentRow = {
  name: string
  email: string
  isPrimary: false
  roleId: ServiceAccountAssignableRoleId
  subjectType: 'service-account'
  serviceAccountId: string
  serviceAccountProjectName: string
  roleBindingId: string
}

/** Role bindings stored on service accounts — shown on the Roles page as principals. */
export function listServiceAccountRoleAssignments(
  tenantSlug: string,
): ServiceAccountRoleAssignmentRow[] {
  return listTenantServiceAccounts(tenantSlug).flatMap((account) =>
    listServiceAccountAssignableRoleBindings(account).map((binding) => ({
      name: account.name,
      email: getServiceAccountPrincipalEmail(account),
      isPrimary: false as const,
      roleId: binding.roleId,
      subjectType: 'service-account' as const,
      serviceAccountId: account.id,
      serviceAccountProjectName: account.projectName,
      roleBindingId: binding.id,
    })),
  )
}

export function isServiceAccountRoleAlreadyBound(
  tenantSlug: string,
  accountId: string,
  roleId: ServiceAccountAssignableRoleId,
): boolean {
  const account = getTenantServiceAccountById(tenantSlug, accountId)
  return Boolean(
    account &&
      listServiceAccountAssignableRoleBindings(account).some((binding) => binding.roleId === roleId),
  )
}

export function buildServiceAccountFilterParts(
  searchValue: string,
  selectedProject: ServiceAccountProjectFilter = 'all',
): string[] {
  const parts: string[] = []

  if (selectedProject !== 'all') {
    parts.push(`project: ${selectedProject}`)
  }

  if (searchValue.trim()) {
    parts.push(`search: "${searchValue.trim()}"`)
  }

  return parts
}

const DEMO_SERVICE_ACCOUNT_NAME_CANDIDATES = [
  'jenkins-deployer',
  'github-actions',
  'tekton-runner',
  'argo-workflow',
  'ci-bot',
] as const

/** Prefill a name that is free in the selected project so the wizard opens valid. */
export function buildDemoCreateServiceAccountForm(
  tenantSlug: string,
  defaultProjectId: string | null,
): {
  name: string
  description: string
  projectId: string | null
} {
  const projectId = defaultProjectId
  let name: string = DEMO_SERVICE_ACCOUNT_NAME_CANDIDATES[0]

  if (projectId) {
    const available = DEMO_SERVICE_ACCOUNT_NAME_CANDIDATES.find(
      (candidate) => !isServiceAccountNameTaken(tenantSlug, candidate, projectId),
    )
    if (available) {
      name = available
    } else {
      let suffix = 2
      while (isServiceAccountNameTaken(tenantSlug, `jenkins-deployer-${suffix}`, projectId)) {
        suffix += 1
      }
      name = `jenkins-deployer-${suffix}`
    }
  }

  return {
    name,
    description: 'CI jobs that call the API.',
    projectId,
  }
}
