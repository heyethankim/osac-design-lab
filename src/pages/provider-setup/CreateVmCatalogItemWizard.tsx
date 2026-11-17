import {
  Alert,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Dropdown,
  DropdownItem,
  DropdownList,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Label,
  MenuToggle,
  Switch,
  TextArea,
  Title,
  Wizard,
  WizardStep,
} from '@patternfly/react-core'
import { LinuxIcon } from '@patternfly/react-icons/dist/esm/icons/linux-icon'
import { RedhatIcon } from '@patternfly/react-icons/dist/esm/icons/redhat-icon'
import { RhStandardGlobeAbstractIcon } from '@patternfly/react-icons/dist/esm/icons/rh-standard-globe-abstract-icon'
import { RhStandardOfficeIcon } from '@patternfly/react-icons/dist/esm/icons/rh-standard-office-icon'
import { WindowsIcon } from '@patternfly/react-icons/dist/esm/icons/windows-icon'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_M360_RATE_CARD_ID,
  findM360OsLicenseRateLine,
  findM360RateLineForPublishSelection,
  formatBareMetalOsLicenseRateLabel,
  formatM360RateLineHourly,
  formatM360RateLineMonthly,
  formatM360RateLineSummary,
  getM360RateCardDisplayName,
} from '../../billing/m360RateLines'
import {
  getCatalogDiskImageOptions,
  getCatalogInstanceTypeOptions,
  isRedHatBrandedDiskImageLabel,
} from '../../catalog/catalogPublishConfig'
import { CatalogWizardPageShell } from '../../components/catalog/CatalogWizardPageShell'
import { KubernetesResourceNameField } from '../../components/shared/KubernetesResourceNameHelper'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import {
  DEFAULT_RATE_CARD,
  type PublishedTemplatePayload,
  type PublishCatalogScope,
} from '../../providerSetup/templateDemo'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'

type VmScope = 'global' | 'tenant'

const DEFAULT_BARE_METAL_CATALOG_NAME = 'bare-metal-general-purpose-server'

const DISK_IMAGES = [
  ...getCatalogDiskImageOptions().map((option) => ({
    id: option.id,
    label: option.label,
    detail: option.detail,
    os: 'linux' as const,
  })),
  {
    id: 'windows-server-2022',
    label: 'Windows Server 2022',
    detail: 'Windows Server · x86_64',
    os: 'windows' as const,
  },
]

/** Bare metal OS cards for Design 2 Hardware (Linux images only). */
const BARE_METAL_OS_OPTIONS = DISK_IMAGES.filter((image) => image.os === 'linux')

const INSTANCE_TYPES = getCatalogInstanceTypeOptions('baremetal').map((option) => {
  const rateLine = findM360RateLineForPublishSelection(
    'baremetal',
    option.id,
    DEFAULT_M360_RATE_CARD_ID,
  )
  return {
    id: option.id,
    label: option.label,
    detail: option.detail,
    accelerator: option.accelerator ?? '',
    rate: rateLine
      ? formatM360RateLineSummary(rateLine)
      : option.hourlyRate ?? 'No M360 rate line',
    hourlyRate: rateLine?.hourlyRate ?? 0,
    monthlyRate: rateLine?.monthlyRate ?? 0,
  }
})

const AUTOMATION_TEMPLATES = [
  { id: 'ocp-virt-rhel-vm', label: 'ocp-virt-rhel-vm' },
  { id: 'ocp-virt-gpu-vm', label: 'ocp-virt-gpu-vm' },
  { id: 'ocp-virt-windows-vm', label: 'ocp-virt-windows-vm' },
] as const
const DEFAULT_AUTOMATION_TEMPLATE_ID = AUTOMATION_TEMPLATES[0].id

const DEFAULT_DISK_IMAGE_ID = DISK_IMAGES.find((image) => image.os === 'linux')?.id ?? 'rhel-10'
const DEFAULT_INSTANCE_TYPE_ID = INSTANCE_TYPES[0]?.id ?? 'small'
const DEFAULT_DESCRIPTION =
  'Use this bare metal server when you need dedicated hardware.'

function resolveVmOsLicenseRateLabel(diskImageId: string): string {
  const line = findM360OsLicenseRateLine(diskImageId, DEFAULT_M360_RATE_CARD_ID)
  if (line) {
    return formatBareMetalOsLicenseRateLabel(line)
  }
  const image = DISK_IMAGES.find((option) => option.id === diskImageId)
  if (image?.os === 'windows') {
    return 'License applies'
  }
  return 'No OS rate'
}

type DiskImageOption = (typeof DISK_IMAGES)[number]

function diskImageOptionIcon(image: DiskImageOption): ReactNode {
  if (image.os === 'windows') {
    return <WindowsIcon />
  }
  if (isRedHatBrandedDiskImageLabel(image.label)) {
    return <RedhatIcon />
  }
  return <LinuxIcon />
}

type InstanceTypeOption = (typeof INSTANCE_TYPES)[number]

function instanceTypeDetail(type: InstanceTypeOption): string {
  const parts = [type.detail]
  if (type.accelerator) {
    parts.push(type.accelerator)
  }
  parts.push(type.rate)
  return parts.join(' · ')
}

function InstanceTypeOptionContent({ type }: { type: InstanceTypeOption }) {
  return (
    <span className="create-vm-instance-type-select__option">
      <Title
        headingLevel="h3"
        size="md"
        className="provider-setup-template__select-card-title create-vm-instance-type-select__label"
      >
        {type.label}
      </Title>
      <span className="create-vm-instance-type-select__detail">{instanceTypeDetail(type)}</span>
    </span>
  )
}

function InstanceTypeSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (instanceTypeId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = INSTANCE_TYPES.find((type) => type.id === value) ?? INSTANCE_TYPES[0] ?? null

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSelect={(_event, selectedValue) => {
        if (selectedValue == null) {
          return
        }
        onChange(String(selectedValue))
        setIsOpen(false)
      }}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          id={id}
          isExpanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          aria-label="Instance type"
          className="create-vm-instance-type-select__toggle bmaas-dropdown-toggle"
        >
          {selected ? <InstanceTypeOptionContent type={selected} /> : 'Select an instance type'}
        </MenuToggle>
      )}
      popperProps={{ appendTo: () => document.body, width: 'trigger' }}
    >
      <DropdownList className="create-vm-instance-type-select__menu">
        {INSTANCE_TYPES.map((type) => (
          <DropdownItem
            key={type.id}
            value={type.id}
            isSelected={value === type.id}
            className="create-vm-instance-type-select__menu-item"
          >
            <InstanceTypeOptionContent type={type} />
          </DropdownItem>
        ))}
      </DropdownList>
    </Dropdown>
  )
}

type CreateVmCatalogItemWizardProps = {
  isOpen: boolean
  organizations: RegisteredOrganization[]
  onClose: () => void
  onCreateCatalogItem: (payload: PublishedTemplatePayload) => void
}

type SelectableOptionCardProps = {
  id: string
  title: string
  description: string
  rate?: string
  icon: ReactNode
  isSelected: boolean
  onSelect: () => void
}

function SelectableOptionCard({
  id,
  title,
  description,
  rate,
  icon,
  isSelected,
  onSelect,
}: SelectableOptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-labelledby={id}
      className={`provider-setup-template__cluster-version-mode-card${
        isSelected ? ' provider-setup-template__cluster-version-mode-card--selected' : ''
      }`}
      onClick={onSelect}
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
      <span className="provider-setup-template__cluster-version-mode-icon" aria-hidden>
        {icon}
      </span>
      <span className="provider-setup-template__cluster-version-mode-copy">
        <Title
          id={id}
          headingLevel="h3"
          size="md"
          className="provider-setup-template__select-card-title"
        >
          {title}
        </Title>
        <Content component="p" className="provider-setup-template__select-card-detail">
          {description}
        </Content>
        {rate ? (
          <Content
            component="p"
            className={`provider-setup-template__select-card-rate${
              isSelected ? ' provider-setup-template__select-card-rate--selected' : ''
            }`}
          >
            {rate}
          </Content>
        ) : null}
      </span>
    </button>
  )
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

export function CreateVmCatalogItemWizard({
  isOpen,
  organizations,
  onClose,
  onCreateCatalogItem,
}: CreateVmCatalogItemWizardProps) {
  const [scope, setScope] = useState<VmScope>('global')
  const [tenantId, setTenantId] = useState('')
  const [name, setName] = useState(DEFAULT_BARE_METAL_CATALOG_NAME)
  const [automationTemplateId, setAutomationTemplateId] = useState<string>(
    DEFAULT_AUTOMATION_TEMPLATE_ID,
  )
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION)
  const [diskImageId, setDiskImageId] = useState(DEFAULT_DISK_IMAGE_ID)
  const [diskImageEditable, setDiskImageEditable] = useState(false)
  const [instanceTypeId, setInstanceTypeId] = useState(DEFAULT_INSTANCE_TYPE_ID)
  const [instanceTypeEditable, setInstanceTypeEditable] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setScope('global')
    setName(DEFAULT_BARE_METAL_CATALOG_NAME)
    setDescription(DEFAULT_DESCRIPTION)
    setAutomationTemplateId(DEFAULT_AUTOMATION_TEMPLATE_ID)
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
  const selectedDiskImage = DISK_IMAGES.find((image) => image.id === diskImageId)
  const selectedInstanceType = INSTANCE_TYPES.find((type) => type.id === instanceTypeId)

  const hardwareRateEstimate = useMemo(() => {
    const hardware = findM360RateLineForPublishSelection(
      'baremetal',
      instanceTypeId,
      DEFAULT_M360_RATE_CARD_ID,
    )
    if (!hardware) {
      return null
    }
    const osLicense =
      findM360OsLicenseRateLine(diskImageId, DEFAULT_M360_RATE_CARD_ID) ??
      ({
        hourlyRate: 0,
        monthlyRate: 0,
      } as const)
    return {
      hardware,
      osLicense,
      totalHourly: Math.round((hardware.hourlyRate + osLicense.hourlyRate) * 100) / 100,
      totalMonthly: Math.round(hardware.monthlyRate + osLicense.monthlyRate),
    }
  }, [diskImageId, instanceTypeId])

  const canContinueDetails =
    isValidKubernetesResourceName(name) &&
    (scope === 'global' || Boolean(tenantId)) &&
    Boolean(selectedAutomationTemplate.id)

  const handleCreate = () => {
    const publishScope: PublishCatalogScope =
      scope === 'tenant' ? 'vip-enterprise' : 'global-public'
    const payload: PublishedTemplatePayload = {
      serviceId: 'baremetal',
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
      instanceTypeId: selectedInstanceType?.id,
      instanceTypeLabel: selectedInstanceType?.label,
      diskImageId: selectedDiskImage?.id,
      diskImageLabel: selectedDiskImage?.label,
      hardwareOsMode: instanceTypeEditable ? 'editable' : 'locked',
      osImageMode: diskImageEditable ? 'editable' : 'locked',
    }
    onCreateCatalogItem(payload)
  }

  if (!isOpen) {
    return null
  }

  return (
    <CatalogWizardPageShell
      title="Create bare metal catalog item"
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
          id="create-vm-catalog-step-details"
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

            <FormGroup label="Scope" fieldId="create-vm-scope" isRequired>
              <div
                id="create-vm-scope"
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
                      id="create-vm-scope-global"
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
                      id="create-vm-scope-tenant"
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
              <FormGroup label="Tenant" fieldId="create-vm-tenant" isRequired>
                <FormSelect
                  id="create-vm-tenant"
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

            <FormGroup label="Name" fieldId="create-vm-name" isRequired>
              <KubernetesResourceNameField
                id="create-vm-name"
                value={name}
                onChange={setName}
                aria-label="Catalog item name"
                isRequired
              />
            </FormGroup>

            <FormGroup label="Description" fieldId="create-vm-description">
              <TextArea
                id="create-vm-description"
                value={description}
                onChange={(_event, value) => setDescription(value)}
                aria-label="Description"
                rows={3}
              />
            </FormGroup>

            <FormGroup
              label="Provisioning template"
              fieldId="create-vm-template"
              isRequired
            >
              <FormSelect
                id="create-vm-template"
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

        <WizardStep id="create-vm-catalog-step-compute" name="Hardware">
          <Form className="create-vm-catalog-wizard__form">
            <Content component="p" className="create-vm-catalog-wizard__lede">
              Choose the instance type and OS for this catalog item.
            </Content>

            <FormGroup
              label="Instance type"
              fieldId="create-vm-instance-type"
              isRequired
              labelInfo={
                <EditableFieldToggle
                  id="create-vm-instance-type-editable"
                  isChecked={instanceTypeEditable}
                  onChange={setInstanceTypeEditable}
                />
              }
            >
              <InstanceTypeSelect
                id="create-vm-instance-type"
                value={instanceTypeId}
                onChange={setInstanceTypeId}
              />
            </FormGroup>

            <FormGroup
              label="OS"
              fieldId="create-vm-os"
              isRequired
              labelInfo={
                <EditableFieldToggle
                  id="create-vm-os-editable"
                  isChecked={diskImageEditable}
                  onChange={setDiskImageEditable}
                />
              }
            >
              <div
                id="create-vm-os"
                className="provider-setup-template__cluster-version-mode-options create-vm-catalog-wizard__option-grid--2 create-vm-catalog-wizard__choice-options"
                role="radiogroup"
                aria-label="OS"
              >
                {BARE_METAL_OS_OPTIONS.map((image) => (
                  <SelectableOptionCard
                    key={image.id}
                    id={`create-vm-os-${image.id}`}
                    title={image.label}
                    description={image.detail}
                    rate={resolveVmOsLicenseRateLabel(image.id)}
                    icon={diskImageOptionIcon(image)}
                    isSelected={diskImageId === image.id}
                    onSelect={() => setDiskImageId(image.id)}
                  />
                ))}
              </div>
            </FormGroup>

            {hardwareRateEstimate ? (
              <div className="create-vm-catalog-wizard__rate-estimate" aria-live="polite">
                <Content component="p" className="create-vm-catalog-wizard__rate-estimate-total">
                  <strong>Estimated total</strong>{' '}
                  {formatM360RateLineHourly({ hourlyRate: hardwareRateEstimate.totalHourly })} (
                  {formatM360RateLineMonthly({ monthlyRate: hardwareRateEstimate.totalMonthly })})
                </Content>
                <Content component="p" className="create-vm-catalog-wizard__rate-estimate-detail">
                  Hardware {formatM360RateLineHourly(hardwareRateEstimate.hardware)}
                  {' + '}
                  OS license {formatM360RateLineHourly(hardwareRateEstimate.osLicense)}
                </Content>
                <Content component="p" className="create-vm-catalog-wizard__rate-estimate-plan">
                  {getM360RateCardDisplayName(DEFAULT_M360_RATE_CARD_ID)}
                </Content>
              </div>
            ) : null}
          </Form>
        </WizardStep>

        <WizardStep
          id="create-vm-catalog-step-review"
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
              Hardware
            </Title>
            <DescriptionList isCompact className="create-vm-catalog-wizard__review-list">
              <ReviewRow
                term="Instance type"
                value={
                  selectedInstanceType
                    ? `${selectedInstanceType.label} · ${instanceTypeDetail(selectedInstanceType)}`
                    : 'Not set'
                }
                editable={instanceTypeEditable}
              />
              <ReviewRow
                term="OS"
                value={
                  selectedDiskImage
                    ? `${selectedDiskImage.label} · ${resolveVmOsLicenseRateLabel(selectedDiskImage.id)}`
                    : 'Not set'
                }
                editable={diskImageEditable}
              />
            </DescriptionList>

            {hardwareRateEstimate ? (
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
                          hourlyRate: hardwareRateEstimate.totalHourly,
                        })}
                      </span>
                      <span className="provider-setup-template__cluster-estimate-monthly">
                        {formatM360RateLineMonthly({
                          monthlyRate: hardwareRateEstimate.totalMonthly,
                        })}
                      </span>
                    </div>
                  </div>
                  <DescriptionList
                    isHorizontal
                    isCompact
                    className="provider-setup-template__cluster-estimate-breakdown"
                  >
                    <DescriptionListGroup>
                      <DescriptionListTerm>Hardware</DescriptionListTerm>
                      <DescriptionListDescription>
                        {formatM360RateLineHourly(hardwareRateEstimate.hardware)}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>OS license</DescriptionListTerm>
                      <DescriptionListDescription>
                        {formatM360RateLineHourly(hardwareRateEstimate.osLicense)}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
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
