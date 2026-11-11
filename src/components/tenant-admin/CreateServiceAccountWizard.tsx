import { useEffect, useMemo, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { RhUiRobotIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-robot-icon'
import {
  Alert,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  TextArea,
} from '@patternfly/react-core'
import { KubernetesResourceNameField } from '../shared/KubernetesResourceNameHelper'
import {
  buildDemoCreateServiceAccountForm,
  buildServiceAccountClientId,
  createTenantServiceAccount,
  isServiceAccountNameTaken,
  TENANT_SERVICE_ACCOUNTS_DEMO,
  updateTenantServiceAccount,
  validateServiceAccountName,
  type ServiceAccountsDesignVariant,
  type TenantServiceAccount,
} from '../../tenantAdmin/serviceAccounts'
import { DEMO_TENANT_ROOT_PROJECT_ID } from '../../tenantAdmin/projects'
import { getTenantProjects } from '../../tenantAdmin/storage'
import {
  NetworkInventoryCreateWizardShell,
  type NetworkInventoryCreateBreadcrumbAncestor,
} from '../networking/NetworkInventoryCreateWizardShell'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../networking/networkInventoryCreateWizard'
import { useWorkspaceWizardStepUrl } from '../../shared/useWorkspaceWizardStepUrl'

type CreateServiceAccountForm = {
  name: string
  description: string
  projectId: string | null
}

const CREATE_SERVICE_ACCOUNT_STEPS_DESIGN1 = [
  { id: 'details', label: 'Details' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

const CREATE_SERVICE_ACCOUNT_STEPS_DESIGN2 = [
  { id: 'general', label: 'General' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

type CreateServiceAccountWizardProps = {
  isOpen: boolean
  tenantSlug: string
  mode?: 'create' | 'edit'
  editingAccount?: TenantServiceAccount | null
  onClose: () => void
  onCreated?: (account: TenantServiceAccount) => void
  onSaved?: (account: TenantServiceAccount) => void
  breadcrumbAncestors?: readonly NetworkInventoryCreateBreadcrumbAncestor[]
  parentLabel?: string
  designVariant?: ServiceAccountsDesignVariant
}

function formFromAccount(account: TenantServiceAccount): CreateServiceAccountForm {
  return {
    name: account.name,
    description: account.description,
    projectId: account.projectId,
  }
}

function formsEqual(left: CreateServiceAccountForm, right: CreateServiceAccountForm): boolean {
  return (
    left.name.trim().toLowerCase() === right.name.trim().toLowerCase() &&
    left.description.trim() === right.description.trim() &&
    left.projectId === right.projectId
  )
}

export function CreateServiceAccountWizard({
  isOpen,
  tenantSlug,
  mode = 'create',
  editingAccount = null,
  onClose,
  onCreated,
  onSaved,
  breadcrumbAncestors,
  parentLabel,
  designVariant = '1',
}: CreateServiceAccountWizardProps) {
  const isDesign2 = designVariant === '2'
  const isEditMode = mode === 'edit' && editingAccount !== null
  const steps = isDesign2 ? CREATE_SERVICE_ACCOUNT_STEPS_DESIGN2 : CREATE_SERVICE_ACCOUNT_STEPS_DESIGN1
  const projects = useMemo(() => getTenantProjects(tenantSlug), [tenantSlug])
  const defaultProjectId =
    projects.find((project) => project.id === DEMO_TENANT_ROOT_PROJECT_ID)?.id ??
    projects[0]?.id ??
    null
  const [form, setForm] = useState<CreateServiceAccountForm>(() =>
    isEditMode && editingAccount
      ? formFromAccount(editingAccount)
      : buildDemoCreateServiceAccountForm(tenantSlug, defaultProjectId),
  )
  const [editBaseline, setEditBaseline] = useState<CreateServiceAccountForm | null>(
    isEditMode && editingAccount ? formFromAccount(editingAccount) : null,
  )

  const selectedProject = projects.find((project) => project.id === form.projectId) ?? null
  const excludeId = isEditMode ? editingAccount?.id : undefined
  const nameError = form.name.trim() ? validateServiceAccountName(form.name) : null
  const nameTaken =
    Boolean(form.name.trim()) &&
    Boolean(form.projectId) &&
    !nameError &&
    !isEditMode &&
    isServiceAccountNameTaken(tenantSlug, form.name, form.projectId!, excludeId)
  const isDetailsStepValid =
    Boolean(form.name.trim()) &&
    !nameError &&
    !nameTaken &&
    Boolean(form.projectId) &&
    Boolean(selectedProject)
  const hasEditChanges = Boolean(editBaseline && !formsEqual(form, editBaseline))
  const canSubmit = isEditMode ? isDetailsStepValid && hasEditChanges : isDetailsStepValid
  const clientIdPreview = buildServiceAccountClientId(tenantSlug, form.name || 'name')

  const { startIndex: wizardStartIndex, onStepChange } = useWorkspaceWizardStepUrl(
    true,
    isOpen,
    steps,
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }
    if (isEditMode && editingAccount) {
      const nextForm = formFromAccount(editingAccount)
      setForm(nextForm)
      setEditBaseline(nextForm)
      return
    }
    setForm(buildDemoCreateServiceAccountForm(tenantSlug, defaultProjectId))
    setEditBaseline(null)
  }, [defaultProjectId, editingAccount, isEditMode, isOpen, tenantSlug])

  const handleClose = () => {
    if (isEditMode && editingAccount) {
      setForm(formFromAccount(editingAccount))
      setEditBaseline(formFromAccount(editingAccount))
    } else {
      setForm(buildDemoCreateServiceAccountForm(tenantSlug, defaultProjectId))
      setEditBaseline(null)
    }
    onClose()
  }

  const handleCreate = () => {
    if (!selectedProject || !isDetailsStepValid) {
      return
    }

    const created = createTenantServiceAccount(tenantSlug, {
      name: form.name,
      description: isDesign2 ? '' : form.description,
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      issueCredential: isDesign2,
    })
    if (!created) {
      return
    }

    onCreated?.(created)
    handleClose()
  }

  const handleSave = () => {
    if (!isEditMode || !editingAccount || !selectedProject || !canSubmit || isDesign2) {
      return
    }

    const updated = updateTenantServiceAccount(tenantSlug, editingAccount.id, {
      name: form.name,
      description: form.description,
      projectId: selectedProject.id,
      projectName: selectedProject.name,
    })
    if (!updated) {
      return
    }

    onSaved?.(updated)
    handleClose()
  }

  function renderStepContent(stepId: string) {
    if (stepId === 'details' || stepId === 'general') {
      return (
        <div className="tenant-admin-service-accounts__wizard-step">
          <Form autoComplete="off" className="tenant-admin-service-accounts__wizard-form">
            {isDesign2 ? (
              <Alert
                variant="info"
                isInline
                title="No permissions on create"
                className="tenant-admin-service-accounts__create-permissions-alert"
              >
                {TENANT_SERVICE_ACCOUNTS_DEMO.noPermissionsOnCreateHelp}
              </Alert>
            ) : null}
            <FormGroup label="Name" fieldId="create-service-account-name" isRequired>
              <KubernetesResourceNameField
                id="create-service-account-name"
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="e.g. jenkins-deployer"
                aria-label="Service account name"
                isRequired
              />
              {nameTaken ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="error">
                      {isDesign2
                        ? 'Name already used in this tenant.'
                        : 'Name already used in this project.'}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              ) : null}
            </FormGroup>
            {isDesign2 ? (
              <FormGroup label="Client ID preview" fieldId="create-service-account-client-id">
                <Content
                  component="p"
                  className="tenant-admin-service-accounts__client-id-preview"
                  id="create-service-account-client-id"
                >
                  <code>{clientIdPreview}</code>
                </Content>
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Generated as <code>sa-&lt;tenant-id&gt;-&lt;name&gt;</code>.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            ) : (
              <FormGroup label="Project" fieldId="create-service-account-project" isRequired>
                <FormSelect
                  id="create-service-account-project"
                  value={form.projectId ?? ''}
                  onChange={(_event, value) => {
                    const nextProjectId = value || null
                    setForm((current) => {
                      if (
                        !isEditMode &&
                        nextProjectId &&
                        isServiceAccountNameTaken(tenantSlug, current.name, nextProjectId)
                      ) {
                        return buildDemoCreateServiceAccountForm(tenantSlug, nextProjectId)
                      }
                      return { ...current, projectId: nextProjectId }
                    })
                  }}
                  aria-label="Project"
                >
                  <FormSelectOption value="" label="Select a project" isDisabled />
                  {projects.map((project) => (
                    <FormSelectOption
                      key={project.id}
                      value={project.id}
                      label={project.name}
                    />
                  ))}
                </FormSelect>
              </FormGroup>
            )}
            {!isDesign2 ? (
              <FormGroup label="Description" fieldId="create-service-account-description">
                <TextArea
                  id="create-service-account-description"
                  value={form.description}
                  onChange={(_event, value) =>
                    setForm((current) => ({ ...current, description: value }))
                  }
                  placeholder="Optional"
                  rows={3}
                  resizeOrientation="vertical"
                />
              </FormGroup>
            ) : null}
          </Form>
        </div>
      )
    }

    return (
      <DescriptionList isCompact className="tenant-admin-service-accounts__wizard-review">
        <DescriptionListGroup>
          <DescriptionListTerm>Name</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{form.name.trim().toLowerCase() || '—'}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
        {isDesign2 ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Client ID</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{clientIdPreview}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : (
          <DescriptionListGroup>
            <DescriptionListTerm>Project</DescriptionListTerm>
            <DescriptionListDescription>
              {selectedProject?.name ?? '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
        {!isDesign2 ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Description</DescriptionListTerm>
            <DescriptionListDescription>
              {form.description.trim() || '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : (
          <DescriptionListGroup>
            <DescriptionListTerm>Permissions</DescriptionListTerm>
            <DescriptionListDescription>None (assign after creation)</DescriptionListDescription>
          </DescriptionListGroup>
        )}
      </DescriptionList>
    )
  }

  function getStepFooter(stepId: string) {
    if (stepId === 'details' || stepId === 'general') {
      return { isNextDisabled: !isDetailsStepValid }
    }

    if (stepId === 'review') {
      return {
        nextButtonText: (
          <span className="tenant-admin-service-accounts__wizard-footer-label">
            <RhUiRobotIcon aria-hidden />
            <span>{isEditMode ? 'Save changes' : TENANT_SERVICE_ACCOUNTS_DEMO.createLabel}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: isEditMode ? handleSave : handleCreate,
        isNextDisabled: !canSubmit,
      }
    }

    return undefined
  }

  return (
    <NetworkInventoryCreateWizardShell
      isOpen={isOpen}
      ancestors={breadcrumbAncestors}
      parentLabel={
        parentLabel ??
        (breadcrumbAncestors?.length ? undefined : TENANT_SERVICE_ACCOUNTS_DEMO.title)
      }
      title={isEditMode ? 'Edit service account' : TENANT_SERVICE_ACCOUNTS_DEMO.createLabel}
      titleId="create-service-account-wizard-title"
      description={
        isEditMode
          ? 'Update this account for a project.'
          : isDesign2
            ? 'Add a non-human account for this tenant.'
            : 'Add an account for a project.'
      }
      steps={steps}
      renderStepContent={renderStepContent}
      getStepFooter={getStepFooter}
      onClose={handleClose}
      leaveConfirmPrimaryActionLabel={isEditMode ? 'Discard changes' : 'Leave'}
      className="tenant-admin-service-accounts__wizard"
      startIndex={wizardStartIndex}
      onStepChange={onStepChange}
    />
  )
}
