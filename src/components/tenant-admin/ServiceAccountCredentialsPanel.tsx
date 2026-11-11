import { useEffect, useRef, useState } from 'react'
import {
  Button,
  ClipboardCopy,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  InputGroup,
  InputGroupItem,
  TextInput,
} from '@patternfly/react-core'
import { EyeIcon } from '@patternfly/react-icons/dist/esm/icons/eye-icon'
import { EyeSlashIcon } from '@patternfly/react-icons/dist/esm/icons/eye-slash-icon'
import {
  buildServiceAccountClientId,
  TENANT_SERVICE_ACCOUNTS_DEMO,
} from '../../tenantAdmin/serviceAccounts'

const MASKED_SECRET = '••••••••••••••••'

type ServiceAccountCredentialsPanelProps = {
  tenantSlug: string
  accountName: string
  clientSecret: string
  onRegenerate?: () => void
  onAssignRoles?: () => void
  showAssignRoles?: boolean
  isRegenerateDisabled?: boolean
}

export function ServiceAccountCredentialsPanel({
  tenantSlug,
  accountName,
  clientSecret,
  onRegenerate,
  onAssignRoles,
  showAssignRoles = false,
  isRegenerateDisabled = false,
}: ServiceAccountCredentialsPanelProps) {
  const [isSecretVisible, setIsSecretVisible] = useState(false)
  const [copyTip, setCopyTip] = useState('Copy')
  const previousSecretRef = useRef(clientSecret)
  const clientId = buildServiceAccountClientId(tenantSlug, accountName)
  const hasSecret = Boolean(clientSecret)

  // Masked dots look identical after regenerate — reveal so the new value is visible.
  useEffect(() => {
    if (
      clientSecret.length > 0 &&
      previousSecretRef.current.length > 0 &&
      previousSecretRef.current !== clientSecret
    ) {
      setIsSecretVisible(true)
    }
    previousSecretRef.current = clientSecret
  }, [clientSecret])

  const handleCopySecret = async () => {
    if (!clientSecret) {
      return
    }
    try {
      await navigator.clipboard.writeText(clientSecret)
      setCopyTip('Copied')
      window.setTimeout(() => setCopyTip('Copy'), 1500)
    } catch {
      setCopyTip('Copy failed')
      window.setTimeout(() => setCopyTip('Copy'), 1500)
    }
  }

  return (
    <div className="tenant-admin-service-accounts__credentials-panel">
      <Content component="p" className="tenant-admin-service-accounts__section-help">
        {TENANT_SERVICE_ACCOUNTS_DEMO.credentialsSectionHelp}
      </Content>
      <DescriptionList
        isCompact
        className="entity-details-page__dl tenant-admin-service-accounts__credentials-dl"
        aria-label="Service account credentials"
      >
        <DescriptionListGroup>
          <DescriptionListTerm>Client ID</DescriptionListTerm>
          <DescriptionListDescription>
            <ClipboardCopy
              isReadOnly
              hoverTip="Copy client ID"
              clickTip="Client ID copied"
              textAriaLabel="Service account client ID"
            >
              {clientId}
            </ClipboardCopy>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Client secret</DescriptionListTerm>
          <DescriptionListDescription>
            {hasSecret ? (
              <InputGroup className="tenant-admin-service-accounts__secret-row">
                <InputGroupItem isFill>
                  <TextInput
                    id="service-account-client-secret"
                    value={isSecretVisible ? clientSecret : MASKED_SECRET}
                    readOnly
                    aria-label="Service account client secret"
                    type="text"
                  />
                </InputGroupItem>
                <InputGroupItem>
                  <Button
                    variant="control"
                    icon={isSecretVisible ? <EyeSlashIcon /> : <EyeIcon />}
                    onClick={() => setIsSecretVisible((current) => !current)}
                    aria-label={isSecretVisible ? 'Hide client secret' : 'Show client secret'}
                  >
                    {isSecretVisible ? 'Hide' : 'Show'}
                  </Button>
                </InputGroupItem>
                <InputGroupItem>
                  <Button variant="control" onClick={() => void handleCopySecret()}>
                    {copyTip}
                  </Button>
                </InputGroupItem>
              </InputGroup>
            ) : (
              'No secret yet. Regenerate to issue a client secret.'
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
      <div className="tenant-admin-service-accounts__credentials-actions">
        {onRegenerate ? (
          <Button
            variant="secondary"
            onClick={onRegenerate}
            isDisabled={isRegenerateDisabled}
          >
            {TENANT_SERVICE_ACCOUNTS_DEMO.regenerateSecretLabel}
          </Button>
        ) : null}
        {showAssignRoles && onAssignRoles ? (
          <Button variant="link" isInline onClick={onAssignRoles}>
            {TENANT_SERVICE_ACCOUNTS_DEMO.assignRolesLabel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
