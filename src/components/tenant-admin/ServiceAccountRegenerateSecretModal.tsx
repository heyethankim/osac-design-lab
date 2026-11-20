import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'

const REGENERATE_PROCESSING_MS = 900

type ServiceAccountRegenerateSecretModalProps = {
  isOpen: boolean
  accountName: string
  onConfirm: () => void
  onClose: () => void
}

export function ServiceAccountRegenerateSecretModal({
  isOpen,
  accountName,
  onConfirm,
  onClose,
}: ServiceAccountRegenerateSecretModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const processingTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false)
      if (processingTimeoutRef.current !== null) {
        window.clearTimeout(processingTimeoutRef.current)
        processingTimeoutRef.current = null
      }
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current !== null) {
        window.clearTimeout(processingTimeoutRef.current)
      }
    }
  }, [])

  const handleConfirm = () => {
    if (isProcessing) {
      return
    }
    setIsProcessing(true)
    processingTimeoutRef.current = window.setTimeout(() => {
      processingTimeoutRef.current = null
      onConfirm()
    }, REGENERATE_PROCESSING_MS)
  }

  const handleClose = () => {
    if (isProcessing) {
      return
    }
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={handleClose}
      aria-labelledby="service-account-regenerate-secret-title"
      aria-describedby="service-account-regenerate-secret-description"
    >
      <ModalHeader
        title="Regenerate secret?"
        titleIconVariant="warning"
        labelId="service-account-regenerate-secret-title"
      />
      <ModalBody>
        <Content component="p" id="service-account-regenerate-secret-description">
          Regenerating invalidates the active client secret for <strong>{accountName}</strong> once
          applied. Existing access tokens remain valid until they expire.
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          onClick={handleConfirm}
          isLoading={isProcessing}
          spinnerAriaValueText="Regenerating secret"
          isDisabled={isProcessing}
        >
          Regenerate Secret
        </Button>
        <Button variant="link" onClick={handleClose} isDisabled={isProcessing}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
