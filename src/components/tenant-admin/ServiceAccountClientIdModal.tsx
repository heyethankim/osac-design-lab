import {
  Button,
  ClipboardCopy,
  Content,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import { buildServiceAccountClientId } from '../../tenantAdmin/serviceAccounts'

type ServiceAccountClientIdModalProps = {
  isOpen: boolean
  tenantSlug: string
  accountName: string
  onClose: () => void
}

export function ServiceAccountClientIdModal({
  isOpen,
  tenantSlug,
  accountName,
  onClose,
}: ServiceAccountClientIdModalProps) {
  const clientId = buildServiceAccountClientId(tenantSlug, accountName)

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="service-account-client-id-title"
      aria-describedby="service-account-client-id-description"
    >
      <ModalHeader title="Client ID" labelId="service-account-client-id-title" />
      <ModalBody>
        <div
          id="service-account-client-id-description"
          className="tenant-admin-service-accounts__credentials"
        >
          <Content component="p" className="tenant-admin-service-accounts__credentials-lede">
            Public identifier for <code>{accountName}</code>.
          </Content>
          <FormGroup label="Client ID" fieldId="service-account-client-id-value">
            <ClipboardCopy
              id="service-account-client-id-value"
              isReadOnly
              hoverTip="Copy client ID"
              clickTip="Client ID copied"
              textAriaLabel="Service account client ID"
            >
              {clientId}
            </ClipboardCopy>
          </FormGroup>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </ModalFooter>
    </Modal>
  )
}
