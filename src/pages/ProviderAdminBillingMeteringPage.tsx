import { ProviderAdminWorkspacePageHeader } from '../components/provider-admin/ProviderAdminWorkspacePageHeader'

export function ProviderAdminBillingMeteringPage() {
  return (
    <div className="provider-admin-workspace-page provider-admin-billing">
      <ProviderAdminWorkspacePageHeader
        title="Billing & metering"
        lede="Track usage metering, reconcile against template rate cards, and review estimated billing."
      />
    </div>
  )
}
