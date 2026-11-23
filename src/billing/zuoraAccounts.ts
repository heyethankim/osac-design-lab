import type { M360BillingAccount } from './m360Accounts'

/**
 * Demo Zuora billing accounts for Design 1 platform selection.
 * Shaped like M360 accounts so the onboarding wizard can reuse link UI.
 */
const DEMO_ZUORA_ACCOUNTS: M360BillingAccount[] = [
  {
    accountId: 'A00078421',
    accountNumber: 'A00078421',
    accountName: 'bluesolace-financial-group',
    accountLabel: 'Enterprise',
    organizationName: 'BlueSolace Financial Group',
    organizationCode: 'Z-BSFG',
    rateCardId: 'zuora-enterprise',
    accountStatus: 'Active',
    approvalStatus: 'Approved',
    externalId: null,
    linkedTenantSlug: null,
  },
  {
    accountId: 'A00089102',
    accountNumber: 'A00089102',
    accountName: 'harborline-capital',
    accountLabel: 'Enterprise',
    organizationName: 'Harborline Capital',
    organizationCode: 'Z-HLC',
    rateCardId: 'zuora-enterprise',
    accountStatus: 'Active',
    approvalStatus: 'Approved',
    externalId: null,
    linkedTenantSlug: null,
  },
  {
    accountId: 'A00090344',
    accountNumber: 'A00090344',
    accountName: 'north-summit-bank',
    accountLabel: 'Enterprise',
    organizationName: 'North Summit Bank',
    organizationCode: 'Z-NSB',
    rateCardId: 'zuora-enterprise',
    accountStatus: 'Active',
    approvalStatus: 'Approved',
    externalId: null,
    linkedTenantSlug: null,
  },
  {
    accountId: 'A00071208',
    accountNumber: 'A00071208',
    accountName: 'redwood-mutual',
    accountLabel: 'Enterprise',
    organizationName: 'Redwood Mutual',
    organizationCode: 'Z-RM',
    rateCardId: 'zuora-standard',
    accountStatus: 'Inactive',
    approvalStatus: 'Approved',
    externalId: null,
    linkedTenantSlug: null,
  },
]

function cloneAccounts(): M360BillingAccount[] {
  return DEMO_ZUORA_ACCOUNTS.map((account) => ({ ...account }))
}

export function listZuoraPortalAccounts(): M360BillingAccount[] {
  return cloneAccounts()
}

export async function fetchZuoraBillingAccounts(): Promise<M360BillingAccount[]> {
  await new Promise((resolve) => window.setTimeout(resolve, 400))
  return listZuoraPortalAccounts()
}
