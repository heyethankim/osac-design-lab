import { useMemo, useState } from 'react'
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core'
import {
  formatClusterMachineTypeLabel,
  getCatalogClusterMachineTypeOption,
  getCatalogClusterMachineTypeOptions,
  type CatalogClusterMachineTypeOption,
} from '../../catalog/catalogPublishConfig'

type ClusterMachineTypeSelectProps = {
  id: string
  value: string
  onChange: (machineTypeId: string) => void
  ariaLabel: string
  isDisabled?: boolean
}

function MachineTypeOptionContent({ option }: { option: CatalogClusterMachineTypeOption }) {
  return (
    <span className="cluster-machine-type-select__option">
      <span className="cluster-machine-type-select__option-label">{option.label}</span>
      <span className="cluster-machine-type-select__option-detail">{option.detail}</span>
    </span>
  )
}

export function ClusterMachineTypeSelect({
  id,
  value,
  onChange,
  ariaLabel,
  isDisabled = false,
}: ClusterMachineTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const options = useMemo(() => getCatalogClusterMachineTypeOptions(), [])
  const selected =
    getCatalogClusterMachineTypeOption(value) ??
    options[0] ??
    null

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!isDisabled) {
          setIsOpen(open)
        }
      }}
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
          isDisabled={isDisabled}
          onClick={() => {
            if (!isDisabled) {
              setIsOpen((open) => !open)
            }
          }}
          aria-label={ariaLabel}
          className="cluster-machine-type-select__toggle bmaas-dropdown-toggle"
        >
          {selected ? (
            <MachineTypeOptionContent option={selected} />
          ) : (
            formatClusterMachineTypeLabel(value)
          )}
        </MenuToggle>
      )}
      popperProps={{ appendTo: () => document.body, width: 'trigger', minWidth: 'trigger' }}
    >
      <DropdownList className="cluster-machine-type-select__menu">
        {options.map((option) => (
          <DropdownItem
            key={option.id}
            value={option.id}
            isSelected={value === option.id}
            className="cluster-machine-type-select__menu-item"
          >
            <MachineTypeOptionContent option={option} />
          </DropdownItem>
        ))}
      </DropdownList>
    </Dropdown>
  )
}
