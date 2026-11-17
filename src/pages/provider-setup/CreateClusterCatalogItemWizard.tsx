import {
  Alert,
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  ExpandableSectionToggle,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  InputGroup,
  InputGroupItem,
  Label,
  List,
  ListComponent,
  ListItem,
  Switch,
  TextArea,
  TextInput,
  Title,
  Wizard,
  WizardStep,
} from '@patternfly/react-core'
import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon'
import { MinusIcon } from '@patternfly/react-icons/dist/esm/icons/minus-icon'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { RhStandardGlobeAbstractIcon } from '@patternfly/react-icons/dist/esm/icons/rh-standard-globe-abstract-icon'
import { RhStandardOfficeIcon } from '@patternfly/react-icons/dist/esm/icons/rh-standard-office-icon'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_M360_RATE_CARD_ID,
  formatClusterTopologyMachineLineLabel,
  formatM360RateLineHourly,
  formatM360RateLineMonthly,
  getM360RateCardDisplayName,
  resolveClusterTopologyMachineRateEstimate,
} from '../../billing/m360RateLines'
import {
  DEFAULT_CLUSTER_MACHINE_TYPE_ID,
  DEFAULT_CLUSTER_TOPOLOGY_NODE_SETS,
  formatClusterTopologyNodeSetValue,
  getCatalogClusterMachineTypeOption,
  getCatalogClusterMachineTypeOptions,
  getCatalogClusterVersionLifecycleMeta,
  getCatalogClusterVersionOptions,
  getLatestCatalogClusterVersionId,
  MAX_CLUSTER_NODE_COUNT,
  MAX_CLUSTER_TOPOLOGY_NODE_SETS,
  MIN_CLUSTER_NODE_COUNT,
} from '../../catalog/catalogPublishConfig'
import { CatalogWizardPageShell } from '../../components/catalog/CatalogWizardPageShell'
import { ClusterMachineTypeSelect } from '../../components/catalog/ClusterMachineTypeSelect'
import { KubernetesResourceNameField } from '../../components/shared/KubernetesResourceNameHelper'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import {
  DEFAULT_RATE_CARD,
  getPublishCatalogSuggestedDescription,
  getPublishCatalogSuggestedDisplayName,
  type PublishedTemplatePayload,
  type PublishCatalogScope,
} from '../../providerSetup/templateDemo'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'

type ClusterScope = 'global' | 'tenant'

const DEFAULT_CLUSTER_CATALOG_NAME = getPublishCatalogSuggestedDisplayName('cluster')
const DEFAULT_DESCRIPTION = getPublishCatalogSuggestedDescription('cluster')
const CLUSTER_VERSION_OPTIONS = getCatalogClusterVersionOptions()
const LATEST_CLUSTER_VERSION_ID = getLatestCatalogClusterVersionId()
const DEFAULT_CLUSTER_VERSION_ID = LATEST_CLUSTER_VERSION_ID || CLUSTER_VERSION_OPTIONS[0]?.id || ''

const AUTOMATION_TEMPLATES = [
  { id: 'standard-cluster-template', label: 'standard-cluster-template' },
  { id: 'gpu-cluster-template', label: 'gpu-cluster-template' },
] as const
const DEFAULT_AUTOMATION_TEMPLATE_ID = AUTOMATION_TEMPLATES[0].id

type ClusterTopologyRow = {
  id: string
  name: string
  machineTypeId: string
  nodeCount: number
}

function clampClusterNodeCount(value: number): number {
  return Math.min(MAX_CLUSTER_NODE_COUNT, Math.max(MIN_CLUSTER_NODE_COUNT, Math.round(value)))
}

function createClusterTopologyRow(
  index: number,
  overrides: Partial<Omit<ClusterTopologyRow, 'id'>> = {},
): ClusterTopologyRow {
  const fallback = DEFAULT_CLUSTER_TOPOLOGY_NODE_SETS[0]
  return {
    id: `create-cluster-node-set-${index}`,
    name: overrides.name ?? fallback.name,
    machineTypeId: overrides.machineTypeId ?? DEFAULT_CLUSTER_MACHINE_TYPE_ID,
    nodeCount: overrides.nodeCount ?? fallback.nodeCount,
  }
}

function createDefaultClusterTopologyRows(): ClusterTopologyRow[] {
  return DEFAULT_CLUSTER_TOPOLOGY_NODE_SETS.map((row, index) =>
    createClusterTopologyRow(index + 1, row),
  )
}

function ClusterNodeCountInput({
  id,
  value,
  onValueChange,
}: {
  id: string
  value: number
  onValueChange: (value: number) => void
}) {
  return (
    <InputGroup className="provider-setup-template__cluster-node-count">
      <InputGroupItem>
        <Button
          variant="control"
          aria-label="Decrease number of nodes"
          onClick={() => onValueChange(clampClusterNodeCount(value - 1))}
          isDisabled={value <= MIN_CLUSTER_NODE_COUNT}
          icon={<MinusIcon />}
        />
      </InputGroupItem>
      <InputGroupItem isFill>
        <TextInput
          id={id}
          type="number"
          value={value}
          min={MIN_CLUSTER_NODE_COUNT}
          max={MAX_CLUSTER_NODE_COUNT}
          onChange={(_event, nextValue) => {
            const next = Number(nextValue)
            if (Number.isNaN(next)) {
              return
            }
            onValueChange(clampClusterNodeCount(next))
          }}
          aria-label="Number of nodes"
        />
      </InputGroupItem>
      <InputGroupItem>
        <Button
          variant="control"
          aria-label="Increase number of nodes"
          onClick={() => onValueChange(clampClusterNodeCount(value + 1))}
          isDisabled={value >= MAX_CLUSTER_NODE_COUNT}
          icon={<PlusIcon />}
        />
      </InputGroupItem>
    </InputGroup>
  )
}


type CreateClusterCatalogItemWizardProps = {
  isOpen: boolean
  organizations: RegisteredOrganization[]
  onClose: () => void
  onCreateCatalogItem: (payload: PublishedTemplatePayload) => void
}

function EditableFieldToggle({
  id,
  isChecked,
  onChange,
}: {
  id: string
  isChecked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Switch
      id={id}
      label={isChecked ? 'Editable at provisioning' : 'Locked'}
      isChecked={isChecked}
      onChange={(_event, checked) => onChange(checked)}
    />
  )
}

function ReviewRow({
  term,
  value,
  editable = false,
}: {
  term: string
  value: string
  editable?: boolean
}) {
  return (
    <DescriptionListGroup>
      <DescriptionListTerm>{term}</DescriptionListTerm>
      <DescriptionListDescription>
        <span className="create-vm-catalog-wizard__review-value">
          <span>{value || '—'}</span>
          {editable ? (
            <Label color="purple" isCompact>
              Editable at provisioning
            </Label>
          ) : null}
        </span>
      </DescriptionListDescription>
    </DescriptionListGroup>
  )
}

export function CreateClusterCatalogItemWizard({
  isOpen,
  organizations,
  onClose,
  onCreateCatalogItem,
}: CreateClusterCatalogItemWizardProps) {
  const [scope, setScope] = useState<ClusterScope>('global')
  const [tenantId, setTenantId] = useState('')
  const [name, setName] = useState(DEFAULT_CLUSTER_CATALOG_NAME)
  const [automationTemplateId, setAutomationTemplateId] = useState<string>(
    DEFAULT_AUTOMATION_TEMPLATE_ID,
  )
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION)
  const [clusterVersionId, setClusterVersionId] = useState(DEFAULT_CLUSTER_VERSION_ID)
  const [clusterVersionEditable, setClusterVersionEditable] = useState(false)
  const [expandedClusterVersionIds, setExpandedClusterVersionIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [clusterTopologyRows, setClusterTopologyRows] = useState<ClusterTopologyRow[]>(() =>
    createDefaultClusterTopologyRows(),
  )
  const [clusterTopologyEditable, setClusterTopologyEditable] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setScope('global')
    setName(DEFAULT_CLUSTER_CATALOG_NAME)
    setDescription(DEFAULT_DESCRIPTION)
    setAutomationTemplateId(DEFAULT_AUTOMATION_TEMPLATE_ID)
    setClusterVersionId(DEFAULT_CLUSTER_VERSION_ID)
    setClusterVersionEditable(false)
    setExpandedClusterVersionIds(new Set())
    setClusterTopologyRows(createDefaultClusterTopologyRows())
    setClusterTopologyEditable(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || organizations.length === 0) {
      return
    }
    setTenantId((current) => {
      if (current && organizations.some((org) => org.tenantId === current)) {
        return current
      }
      const preferred =
        organizations.find((org) => org.slug === 'northsummit') ??
        organizations.find((org) => /north.?summit/i.test(org.name)) ??
        organizations[0]
      return preferred?.tenantId ?? ''
    })
  }, [isOpen, organizations])

  const selectedTenant = organizations.find((org) => org.tenantId === tenantId)
  const selectedTenantLabel =
    selectedTenant?.displayName?.trim() || selectedTenant?.name || tenantId
  const selectedAutomationTemplate =
    AUTOMATION_TEMPLATES.find((template) => template.id === automationTemplateId) ??
    AUTOMATION_TEMPLATES[0]
  const selectedClusterVersion =
    CLUSTER_VERSION_OPTIONS.find((option) => option.id === clusterVersionId) ??
    CLUSTER_VERSION_OPTIONS[0]

  const clusterMachineTypeOptions = useMemo(() => getCatalogClusterMachineTypeOptions(), [])

  const topologyRateEstimate = useMemo(
    () =>
      resolveClusterTopologyMachineRateEstimate(
        clusterTopologyRows.map((row) => ({
          machineTypeId: row.machineTypeId,
          nodeCount: row.nodeCount,
          machineTypeLabel: getCatalogClusterMachineTypeOption(row.machineTypeId)?.label,
        })),
        DEFAULT_M360_RATE_CARD_ID,
      ),
    [clusterTopologyRows],
  )

  const updateTopologyRow = (
    entryId: string,
    patch: Partial<Omit<ClusterTopologyRow, 'id'>>,
  ) => {
    setClusterTopologyRows((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              ...patch,
              nodeCount:
                patch.nodeCount !== undefined
                  ? clampClusterNodeCount(patch.nodeCount)
                  : entry.nodeCount,
            }
          : entry,
      ),
    )
  }

  const addTopologyRow = () => {
    setClusterTopologyRows((current) => {
      if (current.length >= MAX_CLUSTER_TOPOLOGY_NODE_SETS) {
        return current
      }
      const nextIndex =
        current.reduce((max, row) => {
          const match = row.id.match(/create-cluster-node-set-(\d+)/)
          const value = match ? Number(match[1]) : 0
          return value > max ? value : max
        }, 0) + 1
      const nextMachine =
        clusterMachineTypeOptions.find(
          (option) => !current.some((row) => row.machineTypeId === option.id),
        ) ?? clusterMachineTypeOptions[0]
      return [
        ...current,
        createClusterTopologyRow(nextIndex, {
          name: `node-set-${current.length + 1}`,
          machineTypeId: nextMachine?.id ?? DEFAULT_CLUSTER_MACHINE_TYPE_ID,
          nodeCount: 3,
        }),
      ]
    })
  }

  const removeTopologyRow = (entryId: string) => {
    setClusterTopologyRows((current) =>
      current.length <= 1 ? current : current.filter((row) => row.id !== entryId),
    )
  }

  const canContinueDetails =
    isValidKubernetesResourceName(name) &&
    (scope === 'global' || Boolean(tenantId)) &&
    Boolean(selectedAutomationTemplate.id)

  const canContinueClusterVersion = Boolean(selectedClusterVersion?.id)

  const canContinueNodeTopology =
    clusterTopologyRows.length > 0 &&
    clusterTopologyRows.every(
      (row) =>
        isValidKubernetesResourceName(row.name) &&
        Boolean(row.machineTypeId.trim()) &&
        row.nodeCount >= MIN_CLUSTER_NODE_COUNT,
    ) &&
    Boolean(topologyRateEstimate)

  const handleCreate = () => {
    const publishScope: PublishCatalogScope =
      scope === 'tenant' ? 'vip-enterprise' : 'global-public'
    const primaryTopologyRow = clusterTopologyRows[0]
    const payload: PublishedTemplatePayload = {
      serviceId: 'cluster',
      templateRefId: selectedAutomationTemplate.id,
      templateName: selectedAutomationTemplate.label,
      displayName: name.trim(),
      description: description.trim(),
      scope: publishScope,
      rateCard: DEFAULT_RATE_CARD,
      status: 'unpublished',
      enterpriseTenantId: scope === 'tenant' ? tenantId : undefined,
      enterpriseTenantIds: scope === 'tenant' && tenantId ? [tenantId] : undefined,
      vipOrganizationId: scope === 'tenant' ? selectedTenant?.id : undefined,
      vipOrganizationIds:
        scope === 'tenant' && selectedTenant?.id ? [selectedTenant.id] : undefined,
      diskImageId: selectedClusterVersion?.id,
      diskImageLabel: selectedClusterVersion?.label,
      clusterVersionMode: clusterVersionEditable ? 'editable' : 'locked',
      clusterNodeTopologyMode: clusterTopologyEditable ? 'editable' : 'locked',
      clusterTopology: clusterTopologyRows.map((row) => ({
        name: row.name.trim(),
        machineTypeId: row.machineTypeId,
        nodeCount: row.nodeCount,
      })),
      nodeSetId: primaryTopologyRow?.name.trim() || undefined,
      nodeSetLabel: primaryTopologyRow?.name.trim() || undefined,
      hostTypeId: primaryTopologyRow
        ? getCatalogClusterMachineTypeOption(primaryTopologyRow.machineTypeId)?.hostTypeId
        : undefined,
      hostTypeLabel: primaryTopologyRow
        ? getCatalogClusterMachineTypeOption(primaryTopologyRow.machineTypeId)?.label
        : undefined,
    }
    onCreateCatalogItem(payload)
  }

  if (!isOpen) {
    return null
  }

  return (
    <CatalogWizardPageShell
      title="Create cluster catalog item"
      onBackToCatalog={onClose}
      className="catalog-wizard-page--create-vm"
    >
      <Wizard
        className="catalog-wizard-page__wizard create-vm-catalog-wizard"
        height="100%"
        isPlain
        onClose={onClose}
      >
        <WizardStep
          id="create-cluster-catalog-step-details"
          name="General"
          footer={{
            nextButtonText: 'Next',
            onClose,
            isNextDisabled: !canContinueDetails,
          }}
        >
          <Form className="create-vm-catalog-wizard__form">
            <Content component="p" className="create-vm-catalog-wizard__lede">
              Set scope, name, description, and provisioning template. Names are unique per tenant.
            </Content>

            <FormGroup label="Scope" fieldId="create-cluster-scope" isRequired>
              <div
                id="create-cluster-scope"
                className="provider-setup-template__cluster-version-mode-options create-vm-catalog-wizard__scope-options"
                role="radiogroup"
                aria-label="Scope"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={scope === 'global'}
                  className={`provider-setup-template__cluster-version-mode-card${
                    scope === 'global'
                      ? ' provider-setup-template__cluster-version-mode-card--selected'
                      : ''
                  }`}
                  onClick={() => setScope('global')}
                >
                  {scope === 'global' ? (
                    <Label
                      color="grey"
                      isCompact
                      className="provider-setup-template__select-card-selected-badge"
                    >
                      Selected
                    </Label>
                  ) : null}
                  <span
                    className="provider-setup-template__cluster-version-mode-icon"
                    aria-hidden
                  >
                    <RhStandardGlobeAbstractIcon />
                  </span>
                  <span className="provider-setup-template__cluster-version-mode-copy">
                    <Title
                      id="create-cluster-scope-global"
                      headingLevel="h3"
                      size="md"
                      className="provider-setup-template__select-card-title"
                    >
                      Global
                    </Title>
                    <Content
                      component="p"
                      className="provider-setup-template__select-card-detail"
                    >
                      Available to all tenants on the platform
                    </Content>
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={scope === 'tenant'}
                  className={`provider-setup-template__cluster-version-mode-card${
                    scope === 'tenant'
                      ? ' provider-setup-template__cluster-version-mode-card--selected'
                      : ''
                  }`}
                  onClick={() => setScope('tenant')}
                >
                  {scope === 'tenant' ? (
                    <Label
                      color="grey"
                      isCompact
                      className="provider-setup-template__select-card-selected-badge"
                    >
                      Selected
                    </Label>
                  ) : null}
                  <span
                    className="provider-setup-template__cluster-version-mode-icon"
                    aria-hidden
                  >
                    <RhStandardOfficeIcon />
                  </span>
                  <span className="provider-setup-template__cluster-version-mode-copy">
                    <Title
                      id="create-cluster-scope-tenant"
                      headingLevel="h3"
                      size="md"
                      className="provider-setup-template__select-card-title"
                    >
                      Tenant scoped
                    </Title>
                    <Content
                      component="p"
                      className="provider-setup-template__select-card-detail"
                    >
                      Assigned to one tenant
                    </Content>
                  </span>
                </button>
              </div>
            </FormGroup>

            {scope === 'tenant' ? (
              <FormGroup label="Tenant" fieldId="create-cluster-tenant" isRequired>
                <FormSelect
                  id="create-cluster-tenant"
                  value={tenantId}
                  onChange={(_event, value) => setTenantId(value)}
                  aria-label="Select a tenant"
                >
                  <FormSelectOption value="" label="Select a tenant" />
                  {organizations.map((org) => (
                    <FormSelectOption
                      key={org.tenantId}
                      value={org.tenantId}
                      label={org.displayName?.trim() || org.name || org.tenantId}
                    />
                  ))}
                </FormSelect>
              </FormGroup>
            ) : null}

            <FormGroup label="Name" fieldId="create-cluster-name" isRequired>
              <KubernetesResourceNameField
                id="create-cluster-name"
                value={name}
                onChange={setName}
                aria-label="Catalog item name"
                isRequired
              />
            </FormGroup>

            <FormGroup label="Description" fieldId="create-cluster-description">
              <TextArea
                id="create-cluster-description"
                value={description}
                onChange={(_event, value) => setDescription(value)}
                aria-label="Description"
                rows={3}
              />
            </FormGroup>

            <FormGroup
              label="Provisioning template"
              fieldId="create-cluster-template"
              isRequired
            >
              <FormSelect
                id="create-cluster-template"
                value={automationTemplateId}
                onChange={(_event, value) => setAutomationTemplateId(value)}
                aria-label="Provisioning template"
              >
                {AUTOMATION_TEMPLATES.map((template) => (
                  <FormSelectOption
                    key={template.id}
                    value={template.id}
                    label={template.label}
                  />
                ))}
              </FormSelect>
            </FormGroup>
          </Form>
        </WizardStep>

        <WizardStep
          id="create-cluster-catalog-step-version"
          name="Cluster version"
          footer={{
            nextButtonText: 'Next',
            onClose,
            isNextDisabled: !canContinueClusterVersion,
          }}
        >
          <Form className="create-vm-catalog-wizard__form">
            <Content component="p" className="create-vm-catalog-wizard__lede">
              Choose the OpenShift version for this catalog item.
            </Content>

            <FormGroup
              label="Cluster version"
              fieldId="create-cluster-version"
              isRequired
              labelInfo={
                <EditableFieldToggle
                  id="create-cluster-version-editable"
                  isChecked={clusterVersionEditable}
                  onChange={setClusterVersionEditable}
                />
              }
            >
              <div
                id="create-cluster-version"
                className="provider-setup-template__card-group provider-setup-template__card-group--disk-images"
                role="radiogroup"
                aria-label="Cluster version"
              >
                {CLUSTER_VERSION_OPTIONS.map((option) => {
                  const isSelected = option.id === clusterVersionId
                  const isLatest = option.id === LATEST_CLUSTER_VERSION_ID
                  const lifecycleMeta = getCatalogClusterVersionLifecycleMeta(option.lifecycle)
                  const isFeaturesExpanded = expandedClusterVersionIds.has(option.id)
                  const featuresToggleId = `create-cluster-version-features-toggle-${option.id}`
                  const featuresContentId = `create-cluster-version-features-${option.id}`

                  return (
                    <div
                      key={option.id}
                      role="radio"
                      tabIndex={0}
                      aria-checked={isSelected}
                      aria-label={isLatest ? `${option.label}, latest` : option.label}
                      className={`provider-setup-template__select-card provider-setup-template__select-card--disk-image provider-setup-template__select-card--cluster-version${
                        isSelected ? ' provider-setup-template__select-card--selected' : ''
                      }`}
                      onClick={() => setClusterVersionId(option.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setClusterVersionId(option.id)
                        }
                      }}
                    >
                      {isSelected ? (
                        <Label
                          color="grey"
                          isCompact
                          className="provider-setup-template__select-card-selected-badge"
                        >
                          Selected
                        </Label>
                      ) : null}
                      <div className="provider-setup-template__cluster-version-header">
                        <div
                          className="provider-setup-template__cluster-version-toggle-wrap"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <ExpandableSectionToggle
                            isDetached
                            isExpanded={isFeaturesExpanded}
                            toggleId={featuresToggleId}
                            contentId={featuresContentId}
                            toggleAriaLabel={
                              isFeaturesExpanded
                                ? `Hide features for ${option.label}`
                                : `Show features for ${option.label}`
                            }
                            className="provider-setup-template__cluster-version-expand"
                            onToggle={(nextExpanded) => {
                              setExpandedClusterVersionIds((current) => {
                                const next = new Set(current)
                                if (nextExpanded) {
                                  next.add(option.id)
                                } else {
                                  next.delete(option.id)
                                }
                                return next
                              })
                            }}
                          />
                        </div>
                        <div className="provider-setup-template__cluster-version-meta">
                          <div className="provider-setup-template__select-card-title-row">
                            <Title
                              headingLevel="h3"
                              size="md"
                              className="provider-setup-template__select-card-title"
                            >
                              {option.label}
                            </Title>
                            {isLatest ? (
                              <Label color="blue" isCompact>
                                Latest
                              </Label>
                            ) : null}
                            <Label color={lifecycleMeta.color} isCompact>
                              {lifecycleMeta.text}
                            </Label>
                          </div>
                          <Content
                            component="p"
                            className="provider-setup-template__select-card-detail"
                          >
                            {option.detail}
                          </Content>
                        </div>
                      </div>
                      <div
                        className="provider-setup-template__select-card-features"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <ExpandableSection
                          isDetached
                          isExpanded={isFeaturesExpanded}
                          isIndented
                          toggleId={featuresToggleId}
                          contentId={featuresContentId}
                        >
                          <List
                            component={ListComponent.ul}
                            className="provider-setup-template__cluster-version-feature-list"
                          >
                            {option.features.map((feature) => (
                              <ListItem key={feature}>{feature}</ListItem>
                            ))}
                          </List>
                        </ExpandableSection>
                      </div>
                    </div>
                  )
                })}
              </div>
            </FormGroup>
          </Form>
        </WizardStep>

        <WizardStep
          id="create-cluster-catalog-step-topology"
          name="Node topology"
          footer={{
            nextButtonText: 'Next',
            onClose,
            isNextDisabled: !canContinueNodeTopology,
          }}
        >
          <Form className="create-vm-catalog-wizard__form">
            <Content component="p" className="create-vm-catalog-wizard__lede">
              Define default node sets, machine types, and node counts for this offering.
            </Content>

            <FormGroup
              label="Node sets"
              fieldId="create-cluster-node-sets"
              isRequired
              labelInfo={
                <EditableFieldToggle
                  id="create-cluster-topology-editable"
                  isChecked={clusterTopologyEditable}
                  onChange={setClusterTopologyEditable}
                />
              }
            >
              <Table
                id="create-cluster-node-sets"
                variant="compact"
                className="provider-setup-template__cluster-node-sets-table"
                aria-label="Node sets"
              >
                <Thead>
                  <Tr>
                    <Th
                      width={30}
                      modifier="nowrap"
                      className="provider-setup-template__cluster-node-sets-col-name"
                    >
                      Name
                    </Th>
                    <Th
                      width={35}
                      className="provider-setup-template__cluster-node-sets-col-machine"
                    >
                      Machine type
                    </Th>
                    <Th
                      width={25}
                      className="provider-setup-template__cluster-node-sets-col-count"
                    >
                      Number of nodes
                    </Th>
                    <Th screenReaderText="Actions" />
                  </Tr>
                </Thead>
                <Tbody>
                  {clusterTopologyRows.map((row) => (
                    <Tr key={row.id}>
                      <Td
                        dataLabel="Name"
                        className="provider-setup-template__cluster-node-sets-col-name"
                      >
                        <KubernetesResourceNameField
                          id={`create-cluster-node-set-name-${row.id}`}
                          value={row.name}
                          onChange={(value) => updateTopologyRow(row.id, { name: value })}
                          placeholder="workers"
                          aria-label="Node set name"
                          isRequired
                        />
                      </Td>
                      <Td
                        dataLabel="Machine type"
                        className="provider-setup-template__cluster-node-sets-col-machine"
                      >
                        <ClusterMachineTypeSelect
                          id={`create-cluster-machine-type-${row.id}`}
                          value={row.machineTypeId}
                          onChange={(machineTypeId) =>
                            updateTopologyRow(row.id, { machineTypeId })
                          }
                          ariaLabel="Machine type"
                        />
                      </Td>
                      <Td
                        dataLabel="Number of nodes"
                        className="provider-setup-template__cluster-node-sets-col-count"
                      >
                        <ClusterNodeCountInput
                          id={`create-cluster-node-count-${row.id}`}
                          value={row.nodeCount}
                          onValueChange={(nodeCount) =>
                            updateTopologyRow(row.id, { nodeCount })
                          }
                        />
                      </Td>
                      <Td isActionCell>
                        <Button
                          variant="plain"
                          className="provider-setup-template__cluster-node-set-remove"
                          aria-label={`Remove ${row.name.trim() || 'node set'}`}
                          isDisabled={clusterTopologyRows.length <= 1}
                          onClick={() => removeTopologyRow(row.id)}
                          icon={<MinusCircleIcon />}
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {clusterTopologyRows.length < MAX_CLUSTER_TOPOLOGY_NODE_SETS ? (
                <Button
                  variant="link"
                  icon={<PlusIcon />}
                  className="tenant-user-launch-wizard__add-node-set"
                  onClick={addTopologyRow}
                >
                  Add node set
                </Button>
              ) : null}
              {topologyRateEstimate ? (
                <div
                  className="provider-setup-template__cluster-estimate"
                  aria-live="polite"
                  style={{ marginTop: '1rem' }}
                >
                  <div className="provider-setup-template__cluster-estimate-header">
                    <Content
                      component="p"
                      className="provider-setup-template__cluster-estimate-label"
                    >
                      Estimated total
                    </Content>
                    <div className="provider-setup-template__cluster-estimate-totals">
                      <span className="provider-setup-template__cluster-estimate-hourly">
                        {formatM360RateLineHourly({
                          hourlyRate: topologyRateEstimate.hourlyRate,
                        })}
                      </span>
                      <span className="provider-setup-template__cluster-estimate-monthly">
                        {formatM360RateLineMonthly({
                          monthlyRate: topologyRateEstimate.monthlyRate,
                        })}
                      </span>
                    </div>
                  </div>
                  <DescriptionList
                    isHorizontal
                    isCompact
                    className="provider-setup-template__cluster-estimate-breakdown"
                  >
                    {topologyRateEstimate.lines.map((line) => (
                      <DescriptionListGroup key={`${line.machineTypeId}-${line.nodeCount}`}>
                        <DescriptionListTerm>
                          {formatClusterTopologyMachineLineLabel(line)}
                        </DescriptionListTerm>
                        <DescriptionListDescription>
                          {formatM360RateLineHourly({ hourlyRate: line.hourlySubtotal })}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ))}
                  </DescriptionList>
                  <Content
                    component="p"
                    className="provider-setup-template__cluster-estimate-meta"
                  >
                    {getM360RateCardDisplayName(DEFAULT_M360_RATE_CARD_ID)}
                  </Content>
                </div>
              ) : (
                <Alert
                  variant="warning"
                  isInline
                  title="M360 rate line missing"
                  className="provider-setup-template__publish-policies-alert"
                  style={{ marginTop: '1rem' }}
                >
                  Matching machine-type rates must exist on{' '}
                  <strong>{getM360RateCardDisplayName(DEFAULT_M360_RATE_CARD_ID)}</strong>{' '}
                  before this offering can be created.
                </Alert>
              )}
            </FormGroup>
          </Form>
        </WizardStep>

        <WizardStep
          id="create-cluster-catalog-step-review"
          name="Review"
          footer={{
            nextButtonText: 'Create',
            onNext: handleCreate,
            onClose,
          }}
        >
          <div className="create-vm-catalog-wizard__form">
            <Content component="p" className="create-vm-catalog-wizard__lede">
              Confirm settings before creating.
            </Content>

            <Title headingLevel="h3" size="md" className="create-vm-catalog-wizard__review-heading">
              General
            </Title>
            <DescriptionList isCompact className="create-vm-catalog-wizard__review-list">
              <ReviewRow
                term="Scope"
                value={scope === 'global' ? 'Global' : selectedTenantLabel || 'Not set'}
              />
              <ReviewRow term="Name" value={name} />
              <ReviewRow term="Description" value={description || '—'} />
              <ReviewRow
                term="Provisioning template"
                value={selectedAutomationTemplate.label}
              />
              <ReviewRow term="Status" value="Unpublished" />
            </DescriptionList>

            <Title headingLevel="h3" size="md" className="create-vm-catalog-wizard__review-heading">
              Cluster version
            </Title>
            <DescriptionList isCompact className="create-vm-catalog-wizard__review-list">
              <ReviewRow
                term="Cluster version"
                value={selectedClusterVersion?.label ?? 'Not set'}
                editable={clusterVersionEditable}
              />
            </DescriptionList>

            <Title headingLevel="h3" size="md" className="create-vm-catalog-wizard__review-heading">
              Node topology
            </Title>
            <DescriptionList isCompact className="create-vm-catalog-wizard__review-list">
              {clusterTopologyRows.map((row) => (
                <ReviewRow
                  key={row.id}
                  term={row.name.trim() || 'Node set'}
                  value={formatClusterTopologyNodeSetValue(row)}
                  editable={clusterTopologyEditable}
                />
              ))}
            </DescriptionList>

            {topologyRateEstimate ? (
              <div className="provider-setup-template__publish-review-rate">
                <div
                  className="provider-setup-template__cluster-estimate"
                  aria-live="polite"
                >
                  <div className="provider-setup-template__cluster-estimate-header">
                    <Content
                      component="p"
                      className="provider-setup-template__cluster-estimate-label"
                    >
                      Estimated total
                    </Content>
                    <div className="provider-setup-template__cluster-estimate-totals">
                      <span className="provider-setup-template__cluster-estimate-hourly">
                        {formatM360RateLineHourly({
                          hourlyRate: topologyRateEstimate.hourlyRate,
                        })}
                      </span>
                      <span className="provider-setup-template__cluster-estimate-monthly">
                        {formatM360RateLineMonthly({
                          monthlyRate: topologyRateEstimate.monthlyRate,
                        })}
                      </span>
                    </div>
                  </div>
                  <DescriptionList
                    isHorizontal
                    isCompact
                    className="provider-setup-template__cluster-estimate-breakdown"
                  >
                    {topologyRateEstimate.lines.map((line) => (
                      <DescriptionListGroup key={`${line.machineTypeId}-${line.nodeCount}`}>
                        <DescriptionListTerm>
                          {formatClusterTopologyMachineLineLabel(line)}
                        </DescriptionListTerm>
                        <DescriptionListDescription>
                          {formatM360RateLineHourly({ hourlyRate: line.hourlySubtotal })}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ))}
                  </DescriptionList>
                  <Content
                    component="p"
                    className="provider-setup-template__cluster-estimate-meta"
                  >
                    {getM360RateCardDisplayName(DEFAULT_M360_RATE_CARD_ID)}
                  </Content>
                </div>
              </div>
            ) : null}

            <Alert
              variant="info"
              isInline
              title="Starts as unpublished"
              className="provider-setup-template__publish-review-alert"
            >
              <Content component="p">
                New catalog items are saved as unpublished. Publish from the catalog when you
                are ready for tenants to use this offering.
              </Content>
            </Alert>
          </div>
        </WizardStep>
      </Wizard>
    </CatalogWizardPageShell>
  )
}
