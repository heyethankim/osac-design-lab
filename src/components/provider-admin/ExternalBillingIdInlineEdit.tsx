import { useEffect, useId, useRef, useState } from 'react'
import { CheckIcon } from '@patternfly/react-icons/dist/esm/icons/check-icon'
import { PencilAltIcon } from '@patternfly/react-icons/dist/esm/icons/pencil-alt-icon'
import { TimesIcon } from '@patternfly/react-icons/dist/esm/icons/times-icon'
import { Button, TextInput, Tooltip } from '@patternfly/react-core'
import {
  EXTERNAL_BILLING_ID_MAX_LENGTH,
  normalizeExternalBillingId,
} from '../../providerAdmin/organizations'

type ExternalBillingIdInlineEditProps = {
  value: string
  onSave: (nextValue: string) => void
  'aria-label'?: string
}

/**
 * PatternFly field-specific inline edit for Design 2 External billing ID.
 * Used on the tenant detail Overview only — not on cards or list table.
 */
export function ExternalBillingIdInlineEdit({
  value,
  onSave,
  'aria-label': ariaLabel = 'External billing ID',
}: ExternalBillingIdInlineEditProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const trimmedValue = value.trim()
  const trimmedDraft = normalizeExternalBillingId(draft).trim()
  const isDirty = trimmedDraft !== trimmedValue

  useEffect(() => {
    if (!isEditing) {
      setDraft(value)
    }
  }, [isEditing, value])

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const beginEdit = () => {
    setDraft(value)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setDraft(value)
    setIsEditing(false)
  }

  const commitEdit = () => {
    const next = normalizeExternalBillingId(draft).trim()
    setIsEditing(false)
    if (next !== trimmedValue) {
      onSave(next)
    }
  }

  if (isEditing) {
    return (
      <div className="provider-admin-organizations__external-billing-inline provider-admin-organizations__external-billing-inline--editing">
        <TextInput
          ref={inputRef}
          id={inputId}
          value={draft}
          aria-label={ariaLabel}
          placeholder="e.g. A00078421"
          maxLength={EXTERNAL_BILLING_ID_MAX_LENGTH}
          onChange={(_event, next) => setDraft(normalizeExternalBillingId(next))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitEdit()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              cancelEdit()
            }
          }}
        />
        <span className="provider-admin-organizations__external-billing-inline-actions">
          <Button
            variant="plain"
            aria-label={`Save ${ariaLabel}`}
            className={
              isDirty
                ? 'provider-admin-organizations__external-billing-inline-save--dirty'
                : undefined
            }
            icon={<CheckIcon />}
            onClick={commitEdit}
          />
          <Button
            variant="plain"
            aria-label={`Cancel editing ${ariaLabel}`}
            icon={<TimesIcon />}
            onClick={cancelEdit}
          />
        </span>
      </div>
    )
  }

  if (!trimmedValue) {
    return (
      <div className="provider-admin-organizations__external-billing-inline">
        <Button variant="link" isInline onClick={beginEdit}>
          Add external billing ID
        </Button>
      </div>
    )
  }

  return (
    <div className="provider-admin-organizations__external-billing-inline">
      <code className="provider-admin-organizations__external-billing-inline-value">
        {trimmedValue}
      </code>
      <Tooltip content={`Edit ${ariaLabel}`}>
        <Button
          variant="plain"
          aria-label={`Edit ${ariaLabel}`}
          icon={<PencilAltIcon />}
          onClick={beginEdit}
        />
      </Tooltip>
    </div>
  )
}
