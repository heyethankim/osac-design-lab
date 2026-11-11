import {
  Alert,
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

type ServiceAccountRegenerateSecretModalProps = {
  isOpen: boolean
  accountName: string
  /** When set, show the newly issued secret instead of the confirm step. */
  revealed?: { clientId: string; clientSecret: string } | null
  onConfirm: () => void
  onClose: () => void
}

export function ServiceAccountRegenerateSecretModal({
  isOpen,
  accountName,
  revealed = null,
  onConfirm,
  onClose,
}: ServiceAccountRegenerateSecretModalProps) {
  const showingSecret = revealed !== null

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="service-account-regenerate-secret-title"
      aria-describedby="service-account-regenerate-secret-description"
    >
      <ModalHeader
        title={showingSecret ? 'New client secret' : 'Regenerate secret?'}
        titleIconVariant={showingSecret ? undefined : 'warning'}
        labelId="service-account-regenerate-secret-title"
      />
      <ModalBody>
        {showingSecret && revealed ? (
          <div
            id="service-account-regenerate-secret-description"
            className="tenant-admin-service-accounts__credentials"
          >
            <Alert
              variant="warning"
              isInline
              title="Copy this secret now. It will not be shown again."
            />
            <FormGroup label="Client ID" fieldId="service-account-regenerated-client-id">
              <ClipboardCopy
                id="service-account-regenerated-client-id"
                isReadOnly
                hoverTip="Copy client ID"
                clickTip="Client ID copied"
                textAriaLabel="Service account client ID"
              >
                {revealed.clientId}
              </ClipboardCopy>
            </FormGroup>
            <FormGroup label="Client secret" fieldId="service-account-regenerated-client-secret">
              <ClipboardCopy
                id="service-account-regenerated-client-secret"
                isReadOnly
                hoverTip="Copy client secret"
                clickTip="Client secret copied"
                textAriaLabel="Service account client secret"
              >
                {revealed.clientSecret}
              </ClipboardCopy>
            </FormGroup>
          </div>
        ) : (
          <Content component="p" id="service-account-regenerate-secret-description">
            Regenerating will immediately revoke the active client secret for{' '}
            <strong>{accountName}</strong>. Any external pipeline or automated script using the
            current secret will lose access immediately.
          </Content>
        )}
      </ModalBody>
      <ModalFooter>
        {showingSecret ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="danger" onClick={onConfirm}>
              Regenerate Secret
            </Button>
            <Button variant="link" onClick={onClose}>
              Cancel
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}
