import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import { ServiceAccountCredentialsPanel } from './ServiceAccountCredentialsPanel'
import { TENANT_SERVICE_ACCOUNTS_DEMO } from '../../tenantAdmin/serviceAccounts'

type ServiceAccountCredentialsModalProps = {
  isOpen: boolean
  tenantSlug: string
  accountName: string
  clientSecret: string
  onRegenerate?: () => void
  onAssignRoles?: () => void
  showAssignRoles?: boolean
  onClose: () => void
}

export function ServiceAccountCredentialsModal({
  isOpen,
  tenantSlug,
  accountName,
  clientSecret,
  onRegenerate,
  onAssignRoles,
  showAssignRoles = false,
  onClose,
}: ServiceAccountCredentialsModalProps) {
  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="service-account-credentials-title"
    >
      <ModalHeader
        title={`Credentials for ${accountName}`}
        labelId="service-account-credentials-title"
      />
      <ModalBody>
        <ServiceAccountCredentialsPanel
          tenantSlug={tenantSlug}
          accountName={accountName}
          clientSecret={clientSecret}
          onRegenerate={onRegenerate}
          onAssignRoles={onAssignRoles}
          showAssignRoles={showAssignRoles}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
        {showAssignRoles && onAssignRoles ? (
          <Button
            variant="link"
            onClick={() => {
              onAssignRoles()
              onClose()
            }}
          >
            {TENANT_SERVICE_ACCOUNTS_DEMO.assignRolesLabel}
          </Button>
        ) : null}
      </ModalFooter>
    </Modal>
  )
}
