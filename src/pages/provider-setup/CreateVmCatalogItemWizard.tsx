import {
  Button,
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
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Label,
  MenuToggle,
  Switch,
  TextArea,
  TextInput,
  Title,
  Wizard,
  WizardStep,
} from '@patternfly/react-core'
import { CubesIcon } from '@patternfly/react-icons/dist/esm/icons/cubes-icon'
import { LinuxIcon } from '@patternfly/react-icons/dist/esm/icons/linux-icon'
import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { RedhatIcon } from '@patternfly/react-icons/dist/esm/icons/redhat-icon'
import { RhStandardCodeIcon } from '@patternfly/react-icons/dist/esm/icons/rh-standard-code-icon'
import { RhStandardGlobeAbstractIcon } from '@patternfly/react-icons/dist/esm/icons/rh-standard-globe-abstract-icon'
import { RhStandardKeyIcon } from '@patternfly/react-icons/dist/esm/icons/rh-standard-key-icon'
import { RhStandardOfficeIcon } from '@patternfly/react-icons/dist/esm/icons/rh-standard-office-icon'
import { WindowsIcon } from '@patternfly/react-icons/dist/esm/icons/windows-icon'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_M360_RATE_CARD_ID,
  findM360OsLicenseRateLine,
  formatBareMetalOsLicenseRateLabel,
} from '../../billing/m360RateLines'
import {
  getCatalogDiskImageOptions,
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
type GuestOs = 'linux' | 'windows' | 'unspecified'
type CloudInitSource = 'enter-value' | 'select-secret'

const DEFAULT_VM_CATALOG_NAME = 'bare-metal-gpu-training-server'

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

const INSTANCE_TYPES = [
  {
    id: 'vm-type-1-small',
    label: 'Small',
    vcpus: '1 vCPU',
    memory: '2 GiB',
    gpu: '–',
    rate: '$1.20/hr',
  },
  {
    id: 'vm-type-1-medium',
    label: 'Medium',
    vcpus: '2 vCPUs',
    memory: '10 GiB',
    gpu: '–',
    rate: '$2.40/hr',
  },
  {
    id: 'vm-type-1-large',
    label: 'Large',
    vcpus: '4 vCPUs',
    memory: '16 GiB',
    gpu: '–',
    rate: '$4.80/hr',
  },
  {
    id: 'vm-type-1-gpu-small',
    label: 'GPU Small',
    vcpus: '4 vCPUs',
    memory: '16 GiB',
    gpu: '1 GPU',
    rate: '$6.40/hr',
  },
  {
    id: 'vm-type-1-gpu-large',
    label: 'GPU Large',
    vcpus: '8 vCPUs',
    memory: '32 GiB',
    gpu: '2 GPU',
    rate: '$12.80/hr',
  },
]

const BOOT_STORAGE_TIERS = [
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'General-purpose SSD for most virtual machines',
  },
  {
    id: 'performance',
    label: 'Performance',
    description: 'High IOPS for databases and latency-sensitive workloads',
  },
  {
    id: 'capacity',
    label: 'Capacity',
    description: 'Lower cost, higher density for bulk and archival data',
  },
  {
    id: 'ai-ml-optimized',
    label: 'AI/ML optimized',
    description: 'Throughput-optimized tier for training and inference datasets',
  },
] as const
const AUTOMATION_TEMPLATES = [
  { id: 'ocp-virt-rhel-vm', label: 'ocp-virt-rhel-vm' },
  { id: 'ocp-virt-gpu-vm', label: 'ocp-virt-gpu-vm' },
  { id: 'ocp-virt-windows-vm', label: 'ocp-virt-windows-vm' },
] as const
const DEFAULT_AUTOMATION_TEMPLATE_ID = AUTOMATION_TEMPLATES[0].id

const DEFAULT_GUEST_OS: GuestOs = 'linux'
const DEFAULT_DISK_IMAGE_ID = DISK_IMAGES.find((image) => image.os === 'linux')?.id ?? 'rhel-10'
const DEFAULT_INSTANCE_TYPE_ID = 'vm-type-1-medium'
const DEFAULT_BOOT_DISK_SIZE = '120'
const DEFAULT_BOOT_STORAGE_TIER = BOOT_STORAGE_TIERS[0].id
const DEFAULT_DESCRIPTION =
  'General-purpose Linux virtual machine for development and application workloads.'
const DEFAULT_CLOUD_INIT = `#cloud-config
users:
  - name: cloud-user
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
packages:
  - git
  - curl
runcmd:
  - echo "VM catalog item ready" > /etc/motd
`

function defaultDiskImageForGuestOs(guestOs: GuestOs): string {
  if (guestOs === 'windows') {
    return DISK_IMAGES.find((image) => image.os === 'windows')?.id ?? 'windows-server-2022'
  }
  return DISK_IMAGES.find((image) => image.os === 'linux')?.id ?? DEFAULT_DISK_IMAGE_ID
}

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

function diskImageOptionLabel(image: DiskImageOption): string {
  return `${image.label} · ${resolveVmOsLicenseRateLabel(image.id)}`
}

function diskImageOptionIcon(image: DiskImageOption): ReactNode {
  if (image.os === 'windows') {
    return <WindowsIcon />
  }
  if (isRedHatBrandedDiskImageLabel(image.label)) {
    return <RedhatIcon />
  }
  return <LinuxIcon />
}

function DiskImageOptionContent({
  image,
  variant = 'menu',
}: {
  image: DiskImageOption
  variant?: 'menu' | 'toggle'
}) {
  return (
    <span
      className={`create-vm-disk-image-select__option create-vm-disk-image-select__option--${variant}`}
    >
      <span className="create-vm-disk-image-select__icon" aria-hidden>
        {diskImageOptionIcon(image)}
      </span>
      <span className="create-vm-disk-image-select__copy">
        <Title
          headingLevel="h3"
          size="md"
          className="provider-setup-template__select-card-title create-vm-disk-image-select__label"
        >
          {image.label}
        </Title>
        <span className="create-vm-disk-image-select__detail">
          {image.detail} · {resolveVmOsLicenseRateLabel(image.id)}
        </span>
      </span>
    </span>
  )
}

function DiskImageSelect({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value: string
  options: DiskImageOption[]
  onChange: (diskImageId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = options.find((image) => image.id === value) ?? options[0] ?? null

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
          aria-label="Disk image"
          className="create-vm-disk-image-select__toggle bmaas-dropdown-toggle"
        >
          {selected ? (
            <DiskImageOptionContent image={selected} variant="toggle" />
          ) : (
            'Select a disk image'
          )}
        </MenuToggle>
      )}
      popperProps={{ appendTo: () => document.body, width: 'trigger' }}
    >
      <DropdownList className="create-vm-disk-image-select__menu">
        {options.map((image) => (
          <DropdownItem
            key={image.id}
            value={image.id}
            isSelected={value === image.id}
            className="create-vm-disk-image-select__menu-item"
          >
            <DiskImageOptionContent image={image} variant="menu" />
          </DropdownItem>
        ))}
      </DropdownList>
    </Dropdown>
  )
}

type InstanceTypeOption = (typeof INSTANCE_TYPES)[number]

function instanceTypeDetail(type: InstanceTypeOption): string {
  const parts = [type.vcpus, type.memory]
  if (type.gpu && type.gpu !== '–') {
    parts.push(type.gpu)
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

type StorageTierOption = (typeof BOOT_STORAGE_TIERS)[number]

type AdditionalDisk = {
  id: string
  sizeGiB: string
  storageTierId: string
}

const DEFAULT_ADDITIONAL_DISK_SIZE = '30'

function createAdditionalDisk(): AdditionalDisk {
  return {
    id: `disk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sizeGiB: DEFAULT_ADDITIONAL_DISK_SIZE,
    storageTierId: DEFAULT_BOOT_STORAGE_TIER,
  }
}

function StorageTierOptionContent({ tier }: { tier: StorageTierOption }) {
  return (
    <span className="create-vm-instance-type-select__option">
      <Title
        headingLevel="h3"
        size="md"
        className="provider-setup-template__select-card-title create-vm-instance-type-select__label"
      >
        {tier.label}
      </Title>
      <span className="create-vm-instance-type-select__detail">{tier.description}</span>
    </span>
  )
}

function StorageTierSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (storageTierId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selected =
    BOOT_STORAGE_TIERS.find((tier) => tier.id === value) ?? BOOT_STORAGE_TIERS[0] ?? null

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
          aria-label="Boot storage tier"
          className="create-vm-instance-type-select__toggle bmaas-dropdown-toggle"
        >
          {selected ? <StorageTierOptionContent tier={selected} /> : 'Select boot storage tier'}
        </MenuToggle>
      )}
      popperProps={{ appendTo: () => document.body, width: 'trigger' }}
    >
      <DropdownList className="create-vm-instance-type-select__menu">
        {BOOT_STORAGE_TIERS.map((tier) => (
          <DropdownItem
            key={tier.id}
            value={tier.id}
            isSelected={value === tier.id}
            className="create-vm-instance-type-select__menu-item"
          >
            <StorageTierOptionContent tier={tier} />
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
  const [scope, setScope] = useState<VmScope>('tenant')
  const [tenantId, setTenantId] = useState('')
  const [name, setName] = useState(DEFAULT_VM_CATALOG_NAME)
  const [automationTemplateId, setAutomationTemplateId] = useState<string>(
    DEFAULT_AUTOMATION_TEMPLATE_ID,
  )
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION)
  const [guestOs, setGuestOs] = useState<GuestOs>(DEFAULT_GUEST_OS)
  const [diskImageId, setDiskImageId] = useState(DEFAULT_DISK_IMAGE_ID)
  const [diskImageEditable, setDiskImageEditable] = useState(false)
  const [instanceTypeId, setInstanceTypeId] = useState(DEFAULT_INSTANCE_TYPE_ID)
  const [instanceTypeEditable, setInstanceTypeEditable] = useState(false)
  const [bootDiskSize, setBootDiskSize] = useState(DEFAULT_BOOT_DISK_SIZE)
  const [bootDiskEditable, setBootDiskEditable] = useState(false)
  const [bootStorageTier, setBootStorageTier] = useState<string>(DEFAULT_BOOT_STORAGE_TIER)
  const [bootStorageEditable, setBootStorageEditable] = useState(false)
  const [additionalDisks, setAdditionalDisks] = useState<AdditionalDisk[]>([])
  const [cloudInitEditable, setCloudInitEditable] = useState(false)
  const [cloudInitSource, setCloudInitSource] = useState<CloudInitSource>('enter-value')
  const [cloudInitValue, setCloudInitValue] = useState(DEFAULT_CLOUD_INIT)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setName(DEFAULT_VM_CATALOG_NAME)
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

  const filteredDiskImages = useMemo(
    () =>
      DISK_IMAGES.filter((image) =>
        guestOs === 'unspecified' ? true : image.os === guestOs,
      ),
    [guestOs],
  )

  const selectedTenant = organizations.find((org) => org.tenantId === tenantId)
  const selectedTenantLabel =
    selectedTenant?.displayName?.trim() || selectedTenant?.name || tenantId
  const selectedAutomationTemplate =
    AUTOMATION_TEMPLATES.find((template) => template.id === automationTemplateId) ??
    AUTOMATION_TEMPLATES[0]
  const selectedDiskImage = DISK_IMAGES.find((image) => image.id === diskImageId)
  const selectedInstanceType = INSTANCE_TYPES.find((type) => type.id === instanceTypeId)

  const canContinueDetails =
    isValidKubernetesResourceName(name) &&
    (scope === 'global' || Boolean(tenantId)) &&
    Boolean(selectedAutomationTemplate.id)

  const handleCreate = () => {
    const publishScope: PublishCatalogScope =
      scope === 'tenant' ? 'vip-enterprise' : 'global-public'
    const payload: PublishedTemplatePayload = {
      serviceId: 'virtual-machine',
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
      hardwareOsMode: diskImageEditable || instanceTypeEditable ? 'editable' : 'locked',
      osImageMode: diskImageEditable ? 'editable' : 'locked',
    }
    onCreateCatalogItem(payload)
  }

  if (!isOpen) {
    return null
  }

  return (
    <CatalogWizardPageShell
      title="Create virtual machine catalog item"
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
              Set scope, name, description, and automation template. Names are unique per tenant.
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
              label="Automation template"
              fieldId="create-vm-template"
              isRequired
            >
              <FormSelect
                id="create-vm-template"
                value={automationTemplateId}
                onChange={(_event, value) => setAutomationTemplateId(value)}
                aria-label="Automation template"
                aria-describedby="create-vm-template-helper"
              >
                {AUTOMATION_TEMPLATES.map((template) => (
                  <FormSelectOption
                    key={template.id}
                    value={template.id}
                    label={template.label}
                  />
                ))}
              </FormSelect>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem id="create-vm-template-helper">
                    The playbook that creates the VM when a tenant launches this catalog item.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </Form>
        </WizardStep>

        <WizardStep id="create-vm-catalog-step-compute" name="Hardware">
          <Form className="create-vm-catalog-wizard__form">
            <Content component="p" className="create-vm-catalog-wizard__lede">
              Choose the disk image and instance type.
            </Content>

            <FormGroup
              label="Guest operating system"
              fieldId="create-vm-guest-os"
              isRequired
              labelInfo={
                <EditableFieldToggle
                  id="create-vm-disk-image-editable"
                  isChecked={diskImageEditable}
                  onChange={setDiskImageEditable}
                />
              }
            >
              <div
                id="create-vm-guest-os"
                className="provider-setup-template__cluster-version-mode-options create-vm-catalog-wizard__option-grid--3 create-vm-catalog-wizard__choice-options"
                role="radiogroup"
                aria-label="Guest operating system"
              >
                <SelectableOptionCard
                  id="create-vm-guest-linux"
                  title="Linux"
                  description="RHEL, Ubuntu, Fedora, and more"
                  icon={<LinuxIcon />}
                  isSelected={guestOs === 'linux'}
                  onSelect={() => {
                    setGuestOs('linux')
                    setDiskImageId(defaultDiskImageForGuestOs('linux'))
                  }}
                />
                <SelectableOptionCard
                  id="create-vm-guest-windows"
                  title="Microsoft Windows"
                  description="Windows Server and desktop"
                  icon={<WindowsIcon />}
                  isSelected={guestOs === 'windows'}
                  onSelect={() => {
                    setGuestOs('windows')
                    setDiskImageId(defaultDiskImageForGuestOs('windows'))
                  }}
                />
                <SelectableOptionCard
                  id="create-vm-guest-unspecified"
                  title="Unspecified"
                  description="Any available image"
                  icon={<CubesIcon />}
                  isSelected={guestOs === 'unspecified'}
                  onSelect={() => {
                    setGuestOs('unspecified')
                    setDiskImageId(defaultDiskImageForGuestOs('unspecified'))
                  }}
                />
              </div>
            </FormGroup>

            <FormGroup label="Disk image" fieldId="create-vm-disk-image" isRequired>
              <DiskImageSelect
                id="create-vm-disk-image"
                value={diskImageId}
                options={filteredDiskImages}
                onChange={setDiskImageId}
              />
            </FormGroup>

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
          </Form>
        </WizardStep>

        <WizardStep id="create-vm-catalog-step-storage" name="Storage">
          <Form className="create-vm-catalog-wizard__form">
            <Content component="p" className="create-vm-catalog-wizard__lede">
              Set boot disk size, storage tier, and any additional disks.
            </Content>

            <FormGroup
              label="Boot disk size (GiB)"
              fieldId="create-vm-boot-disk"
              isRequired
              labelInfo={
                <EditableFieldToggle
                  id="create-vm-boot-disk-editable"
                  isChecked={bootDiskEditable}
                  onChange={setBootDiskEditable}
                />
              }
            >
              <TextInput
                id="create-vm-boot-disk"
                type="number"
                min={1}
                value={bootDiskSize}
                onChange={(_event, value) => setBootDiskSize(value)}
                aria-label="Boot disk size in GiB"
              />
            </FormGroup>

            <FormGroup
              label="Boot storage tier"
              fieldId="create-vm-boot-tier"
              isRequired
              labelInfo={
                <EditableFieldToggle
                  id="create-vm-boot-tier-editable"
                  isChecked={bootStorageEditable}
                  onChange={setBootStorageEditable}
                />
              }
            >
              <StorageTierSelect
                id="create-vm-boot-tier"
                value={bootStorageTier}
                onChange={setBootStorageTier}
              />
            </FormGroup>

            <div className="create-vm-catalog-wizard__additional-disks">
              {additionalDisks.length > 0 ? (
                <div className="create-vm-catalog-wizard__additional-disk-list">
                  {additionalDisks.map((disk, index) => (
                    <div key={disk.id} className="create-vm-catalog-wizard__additional-disk">
                      <div className="create-vm-catalog-wizard__additional-disk-header">
                        <Title headingLevel="h4" size="md">
                          Disk set {index + 1}
                        </Title>
                        <Button
                          variant="link"
                          isInline
                          isDanger
                          icon={<MinusCircleIcon />}
                          onClick={() =>
                            setAdditionalDisks((current) =>
                              current.filter((item) => item.id !== disk.id),
                            )
                          }
                        >
                          Remove
                        </Button>
                      </div>
                      <FormGroup
                        label="Disk size (GiB)"
                        fieldId={`create-vm-additional-disk-size-${disk.id}`}
                        isRequired
                      >
                        <TextInput
                          id={`create-vm-additional-disk-size-${disk.id}`}
                          type="number"
                          min={1}
                          value={disk.sizeGiB}
                          onChange={(_event, value) =>
                            setAdditionalDisks((current) =>
                              current.map((item) =>
                                item.id === disk.id ? { ...item, sizeGiB: value } : item,
                              ),
                            )
                          }
                          aria-label={`Disk set ${index + 1} size`}
                        />
                      </FormGroup>
                      <FormGroup
                        label="Storage tier"
                        fieldId={`create-vm-additional-disk-tier-${disk.id}`}
                        isRequired
                      >
                        <StorageTierSelect
                          id={`create-vm-additional-disk-tier-${disk.id}`}
                          value={disk.storageTierId}
                          onChange={(storageTierId) =>
                            setAdditionalDisks((current) =>
                              current.map((item) =>
                                item.id === disk.id ? { ...item, storageTierId } : item,
                              ),
                            )
                          }
                        />
                      </FormGroup>
                    </div>
                  ))}
                </div>
              ) : null}
              <Button
                variant="link"
                isInline
                icon={<PlusCircleIcon />}
                onClick={() =>
                  setAdditionalDisks((current) => [...current, createAdditionalDisk()])
                }
              >
                Add disk
              </Button>
            </div>
          </Form>
        </WizardStep>

        <WizardStep id="create-vm-catalog-step-access" name="Initialization">
          <Form className="create-vm-catalog-wizard__form">
            <Content component="p" className="create-vm-catalog-wizard__lede">
              Add cloud-init user data for first boot.
            </Content>

            <FormGroup
              label="Cloud-init"
              fieldId="create-vm-cloud-init"
              labelInfo={
                <EditableFieldToggle
                  id="create-vm-cloud-init-editable"
                  isChecked={cloudInitEditable}
                  onChange={setCloudInitEditable}
                />
              }
            >
              <div
                id="create-vm-cloud-init"
                className="provider-setup-template__cluster-version-mode-options create-vm-catalog-wizard__choice-options"
                role="radiogroup"
                aria-label="Cloud-init source"
              >
                <SelectableOptionCard
                  id="create-vm-cloud-init-enter"
                  title="Enter value"
                  description="Paste cloud-init user data"
                  icon={<RhStandardCodeIcon />}
                  isSelected={cloudInitSource === 'enter-value'}
                  onSelect={() => setCloudInitSource('enter-value')}
                />
                <SelectableOptionCard
                  id="create-vm-cloud-init-secret"
                  title="Select secret"
                  description="Use a Cloud-init secret from this project"
                  icon={<RhStandardKeyIcon />}
                  isSelected={cloudInitSource === 'select-secret'}
                  onSelect={() => setCloudInitSource('select-secret')}
                />
              </div>
            </FormGroup>

            {cloudInitSource === 'enter-value' ? (
              <FormGroup label="Cloud-init" fieldId="create-vm-cloud-init-value">
                <TextArea
                  id="create-vm-cloud-init-value"
                  value={cloudInitValue}
                  onChange={(_event, value) => setCloudInitValue(value)}
                  aria-label="Add cloud-init configuration"
                  placeholder="Add cloud-init configuration"
                  rows={8}
                />
              </FormGroup>
            ) : (
              <FormGroup label="Cloud-init secret" fieldId="create-vm-cloud-init-secret">
                <FormSelect id="create-vm-cloud-init-secret" value="" aria-label="Select secret">
                  <FormSelectOption value="" label="Select a Cloud-init secret" />
                </FormSelect>
              </FormGroup>
            )}
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
              Confirm settings before creating. The item stays unpublished until you publish it.
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
                term="Automation template"
                value={selectedAutomationTemplate.label}
              />
              <ReviewRow term="Status" value="Unpublished" />
            </DescriptionList>

            <Title headingLevel="h3" size="md" className="create-vm-catalog-wizard__review-heading">
              Hardware
            </Title>
            <DescriptionList isCompact className="create-vm-catalog-wizard__review-list">
              <ReviewRow
                term="Guest operating system"
                value={
                  guestOs === 'linux'
                    ? 'Linux'
                    : guestOs === 'windows'
                      ? 'Microsoft Windows'
                      : 'Unspecified'
                }
              />
              <ReviewRow
                term="Disk image"
                value={
                  selectedDiskImage
                    ? diskImageOptionLabel(selectedDiskImage)
                    : 'Not set'
                }
                editable={diskImageEditable}
              />
              <ReviewRow
                term="Instance type"
                value={
                  selectedInstanceType
                    ? `${selectedInstanceType.label} · ${instanceTypeDetail(selectedInstanceType)}`
                    : 'Not set'
                }
                editable={instanceTypeEditable}
              />
            </DescriptionList>

            <Title headingLevel="h3" size="md" className="create-vm-catalog-wizard__review-heading">
              Storage
            </Title>
            <DescriptionList isCompact className="create-vm-catalog-wizard__review-list">
              <ReviewRow
                term="Boot disk size"
                value={bootDiskSize ? `${bootDiskSize} GiB` : 'Not set'}
                editable={bootDiskEditable}
              />
              <ReviewRow
                term="Boot storage tier"
                value={
                  BOOT_STORAGE_TIERS.find((tier) => tier.id === bootStorageTier)?.label ||
                  'Not set'
                }
                editable={bootStorageEditable}
              />
            </DescriptionList>

            <Title headingLevel="h3" size="md" className="create-vm-catalog-wizard__review-heading">
              Initialization
            </Title>
            <DescriptionList isCompact className="create-vm-catalog-wizard__review-list">
              <ReviewRow
                term="Cloud-init"
                value={
                  cloudInitSource === 'enter-value'
                    ? cloudInitValue.trim() || 'Not set'
                    : 'Secret'
                }
                editable={cloudInitEditable}
              />
            </DescriptionList>
          </div>
        </WizardStep>
      </Wizard>
    </CatalogWizardPageShell>
  )
}
