import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Button,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  FormSelect,
  FormSelectOption,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  SearchInput,
  Title,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { CatalogFilterEmptyState } from '../../components/catalog/CatalogFilterEmptyState'
import { CatalogFilterResultsSummary } from '../../components/catalog/CatalogFilterResultsSummary'
import { CatalogSpecRowsList } from '../../components/catalog/CatalogSpecRowsList'
import {
  renderInventoryCardIcon,
  SERVICE_ACCOUNT_CARD_ICON,
} from '../../components/catalog/inventoryCardIcons'
import { ViewModeToggle } from '../../components/catalog/CatalogViewToggle'
import { getAdministrationViewMode, setAdministrationViewMode, type ViewMode } from '../../catalog/viewMode'
import { CreateServiceAccountWizard } from '../../components/tenant-admin/CreateServiceAccountWizard'
import { ServiceAccountCredentialsModal } from '../../components/tenant-admin/ServiceAccountCredentialsModal'
import { ServiceAccountDetailsPage } from '../../components/tenant-admin/ServiceAccountDetailsPage'
import { ServiceAccountRegenerateSecretModal } from '../../components/tenant-admin/ServiceAccountRegenerateSecretModal'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { TOPIC_SERVICE_ACCOUNTS } from '../../designHub/topics'
import {
  buildServiceAccountClientId,
  buildServiceAccountFilterParts,
  deleteTenantServiceAccount,
  ensureServiceAccountSingleCredential,
  formatServiceAccountCreatedAt,
  getServiceAccountStatus,
  getServiceAccountStatusColor,
  getServiceAccountStatusLabel,
  getServiceAccountTokenValue,
  getTenantServiceAccountById,
  listServiceAccountTokenSecrets,
  listTenantServiceAccounts,
  markTenantServiceAccountDeleting,
  regenerateServiceAccountSecret,
  TENANT_SERVICE_ACCOUNTS_DEMO,
  type ServiceAccountProjectFilter,
  type ServiceAccountsDesignVariant,
  type TenantServiceAccount,
} from '../../tenantAdmin/serviceAccounts'
import { getTenantProjects } from '../../tenantAdmin/storage'
import {
  WORKSPACE_ACTION_CREATE_SERVICE_ACCOUNT,
  getWorkspaceActionParam,
  syncWorkspaceActionParam,
} from '../../shared/workspaceNavUrl'

type TenantAdminServiceAccountsPageProps = {
  tenantSlug: string
}

function resolveServiceAccountsDesign(
  searchParams: URLSearchParams,
): ServiceAccountsDesignVariant {
  const topic = searchParams.get('topic')?.trim()
  const design = searchParams.get('design')?.trim()
  if (topic === TOPIC_SERVICE_ACCOUNTS && design === '2') {
    return '2'
  }
  return '1'
}

function getAccountClientSecret(tenantSlug: string, account: TenantServiceAccount): string {
  const ensured = ensureServiceAccountSingleCredential(tenantSlug, account.id) ?? account
  const secret = listServiceAccountTokenSecrets(tenantSlug, ensured)[0]
  return secret ? getServiceAccountTokenValue(secret) : ''
}

export function TenantAdminServiceAccountsPage({ tenantSlug }: TenantAdminServiceAccountsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const designVariant = resolveServiceAccountsDesign(searchParams)
  const isDesign2 = designVariant === '2'
  const [accounts, setAccounts] = useState<TenantServiceAccount[]>(() =>
    listTenantServiceAccounts(tenantSlug),
  )
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [selectedProject, setSelectedProject] = useState<ServiceAccountProjectFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>(() => getAdministrationViewMode())
  const [accountPendingDelete, setAccountPendingDelete] = useState<TenantServiceAccount | null>(
    null,
  )
  const [accountPendingEdit, setAccountPendingEdit] = useState<TenantServiceAccount | null>(null)
  const [credentialsAccount, setCredentialsAccount] = useState<TenantServiceAccount | null>(null)
  const [regenerateAccount, setRegenerateAccount] = useState<TenantServiceAccount | null>(null)
  const [regeneratedCredentials, setRegeneratedCredentials] = useState<{
    clientId: string
    clientSecret: string
  } | null>(null)
  const [focusPermissionsOnOpen, setFocusPermissionsOnOpen] = useState(false)

  const projects = useMemo(() => getTenantProjects(tenantSlug), [tenantSlug])
  const selectedAccount = selectedAccountId
    ? (accounts.find((account) => account.id === selectedAccountId) ??
      getTenantServiceAccountById(tenantSlug, selectedAccountId))
    : null

  useEffect(() => {
    setAccounts(listTenantServiceAccounts(tenantSlug))
  }, [tenantSlug])

  useEffect(() => {
    const isCreateAction =
      getWorkspaceActionParam(searchParams) === WORKSPACE_ACTION_CREATE_SERVICE_ACCOUNT
    setIsWizardOpen(isCreateAction)
    if (isCreateAction) {
      setSelectedAccountId(null)
    }
  }, [searchParams])

  const openCreateWizard = () => {
    syncWorkspaceActionParam(setSearchParams, WORKSPACE_ACTION_CREATE_SERVICE_ACCOUNT)
  }

  const closeCreateWizard = () => {
    if (getWorkspaceActionParam(searchParams) === WORKSPACE_ACTION_CREATE_SERVICE_ACCOUNT) {
      syncWorkspaceActionParam(setSearchParams, null, { replace: true })
    } else {
      setIsWizardOpen(false)
    }
  }

  const filteredAccounts = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return accounts.filter((account) => {
      if (!isDesign2 && selectedProject !== 'all' && account.projectId !== selectedProject) {
        return false
      }

      if (!query) {
        return true
      }

      const clientId = buildServiceAccountClientId(tenantSlug, account.name).toLowerCase()

      return (
        account.name.toLowerCase().includes(query) ||
        account.description.toLowerCase().includes(query) ||
        (!isDesign2 && account.projectName.toLowerCase().includes(query)) ||
        account.labels.some((label) => label.toLowerCase().includes(query)) ||
        (isDesign2 && clientId.includes(query)) ||
        (isDesign2 &&
          getServiceAccountStatusLabel(getServiceAccountStatus(account))
            .toLowerCase()
            .includes(query))
      )
    })
  }, [accounts, isDesign2, searchValue, selectedProject, tenantSlug])

  const filterDescriptionParts = useMemo(() => {
    if (isDesign2) {
      return buildServiceAccountFilterParts(searchValue, 'all')
    }
    const projectLabel =
      selectedProject === 'all'
        ? 'all'
        : (projects.find((project) => project.id === selectedProject)?.name ?? selectedProject)
    return buildServiceAccountFilterParts(
      searchValue,
      selectedProject === 'all' ? 'all' : projectLabel,
    )
  }, [isDesign2, projects, searchValue, selectedProject])

  const isUnfilteredEmpty = accounts.length === 0

  const clearAllFilters = () => {
    setSearchValue('')
    setSelectedProject('all')
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setAdministrationViewMode(mode)
  }

  const refreshAccounts = () => {
    setAccounts(listTenantServiceAccounts(tenantSlug))
  }

  const handleCreated = (account: TenantServiceAccount) => {
    refreshAccounts()
    setSelectedAccountId(account.id)
  }

  const openEdit = (account: TenantServiceAccount) => {
    if (isDesign2 || getServiceAccountStatus(account) === 'deleting') {
      return
    }
    setAccountPendingEdit(account)
  }

  const closeEdit = () => {
    setAccountPendingEdit(null)
  }

  const handleSaved = (account: TenantServiceAccount) => {
    refreshAccounts()
    setSelectedAccountId(account.id)
  }

  const handleConfirmDelete = () => {
    if (!accountPendingDelete) {
      return
    }

    if (isDesign2) {
      const next = markTenantServiceAccountDeleting(tenantSlug, accountPendingDelete.id)
      setAccounts(next)
    } else {
      const next = deleteTenantServiceAccount(tenantSlug, accountPendingDelete.id)
      setAccounts(next)
      if (selectedAccountId === accountPendingDelete.id) {
        setSelectedAccountId(null)
      }
    }
    setAccountPendingDelete(null)
  }

  const handleConfirmRegenerate = () => {
    if (!regenerateAccount) {
      return
    }
    const result = regenerateServiceAccountSecret(tenantSlug, regenerateAccount.id)
    if (!result) {
      return
    }
    refreshAccounts()
    setRegeneratedCredentials({
      clientId: result.clientId,
      clientSecret: result.clientSecret,
    })
    if (credentialsAccount?.id === regenerateAccount.id) {
      setCredentialsAccount(result.account)
    }
  }

  const getRowActions = (account: TenantServiceAccount): IAction[] => {
    const isDeleting = getServiceAccountStatus(account) === 'deleting'
    if (isDesign2) {
      return [
        {
          title: 'View details',
          onClick: () => setSelectedAccountId(account.id),
        },
        {
          title: TENANT_SERVICE_ACCOUNTS_DEMO.viewCredentialsLabel,
          isDisabled: isDeleting,
          onClick: () => {
            ensureServiceAccountSingleCredential(tenantSlug, account.id)
            refreshAccounts()
            setCredentialsAccount(getTenantServiceAccountById(tenantSlug, account.id) ?? account)
          },
        },
        {
          title: TENANT_SERVICE_ACCOUNTS_DEMO.regenerateSecretLabel,
          isDisabled: isDeleting,
          onClick: () => {
            setRegeneratedCredentials(null)
            setRegenerateAccount(account)
          },
        },
        {
          isSeparator: true,
        },
        {
          title: 'Delete',
          isDanger: true,
          isDisabled: isDeleting,
          onClick: () => setAccountPendingDelete(account),
        },
      ]
    }

    return [
      {
        title: 'View details',
        onClick: () => setSelectedAccountId(account.id),
      },
      {
        title: 'Edit',
        onClick: () => openEdit(account),
      },
      {
        isSeparator: true,
      },
      {
        title: 'Delete',
        isDanger: true,
        onClick: () => setAccountPendingDelete(account),
      },
    ]
  }

  const deleteModal = (
    <Modal
      variant={ModalVariant.small}
      isOpen={accountPendingDelete !== null}
      onClose={() => setAccountPendingDelete(null)}
      aria-labelledby="delete-service-account-title"
      aria-describedby="delete-service-account-description"
    >
      <ModalHeader
        title={
          isDesign2 && accountPendingDelete
            ? `Delete ${accountPendingDelete.name}?`
            : 'Delete service account?'
        }
        titleIconVariant="warning"
        labelId="delete-service-account-title"
      />
      <ModalBody>
        <Content component="p" id="delete-service-account-description">
          {accountPendingDelete ? (
            isDesign2 ? (
              'Access ends immediately. Status stays Deleting until cleanup finishes.'
            ) : (
              <>
                <strong>{accountPendingDelete.name}</strong> and its linked token secrets will be
                removed. Automations using these credentials will stop working. This cannot be
                undone.
              </>
            )
          ) : (
            'This service account and its linked token secrets will be removed.'
          )}
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button variant="danger" onClick={handleConfirmDelete}>
          Delete
        </Button>
        <Button variant="link" onClick={() => setAccountPendingDelete(null)}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )

  const design2Modals = isDesign2 ? (
    <>
      <ServiceAccountCredentialsModal
        isOpen={credentialsAccount !== null}
        tenantSlug={tenantSlug}
        accountName={credentialsAccount?.name ?? ''}
        clientSecret={
          credentialsAccount ? getAccountClientSecret(tenantSlug, credentialsAccount) : ''
        }
        showAssignRoles
        onAssignRoles={() => {
          if (!credentialsAccount) {
            return
          }
          setSelectedAccountId(credentialsAccount.id)
          setFocusPermissionsOnOpen(true)
          setCredentialsAccount(null)
        }}
        onRegenerate={() => {
          if (!credentialsAccount) {
            return
          }
          setRegeneratedCredentials(null)
          setRegenerateAccount(credentialsAccount)
        }}
        onClose={() => setCredentialsAccount(null)}
      />
      <ServiceAccountRegenerateSecretModal
        isOpen={regenerateAccount !== null}
        accountName={regenerateAccount?.name ?? ''}
        revealed={regeneratedCredentials}
        onConfirm={handleConfirmRegenerate}
        onClose={() => {
          setRegenerateAccount(null)
          setRegeneratedCredentials(null)
        }}
      />
    </>
  ) : null

  if (isWizardOpen) {
    return (
      <>
        <CreateServiceAccountWizard
          isOpen
          tenantSlug={tenantSlug}
          designVariant={designVariant}
          onClose={closeCreateWizard}
          onCreated={handleCreated}
          parentLabel={TENANT_SERVICE_ACCOUNTS_DEMO.title}
        />
        {deleteModal}
        {design2Modals}
      </>
    )
  }

  if (accountPendingEdit && !isDesign2) {
    return (
      <>
        <CreateServiceAccountWizard
          isOpen
          mode="edit"
          tenantSlug={tenantSlug}
          designVariant={designVariant}
          editingAccount={accountPendingEdit}
          onClose={closeEdit}
          onSaved={handleSaved}
          parentLabel={TENANT_SERVICE_ACCOUNTS_DEMO.title}
        />
        {deleteModal}
      </>
    )
  }

  if (selectedAccount) {
    return (
      <>
        <ServiceAccountDetailsPage
          tenantSlug={tenantSlug}
          account={selectedAccount}
          designVariant={designVariant}
          focusPermissions={focusPermissionsOnOpen}
          onFocusPermissionsConsumed={() => setFocusPermissionsOnOpen(false)}
          onBack={() => setSelectedAccountId(null)}
          onAccountChange={(account) => {
            refreshAccounts()
            setSelectedAccountId(account.id)
          }}
          onEdit={() => openEdit(selectedAccount)}
          onDelete={() => setAccountPendingDelete(selectedAccount)}
        />
        {deleteModal}
        {design2Modals}
      </>
    )
  }

  return (
    <div className="provider-admin-workspace-page tenant-admin-administration tenant-admin-service-accounts">
      <ProviderAdminWorkspacePageHeader
        kicker="Administration"
        title={TENANT_SERVICE_ACCOUNTS_DEMO.title}
        lede={
          isDesign2
            ? 'Manage non-human identities for this tenant. Accounts are scoped to the tenant root.'
            : TENANT_SERVICE_ACCOUNTS_DEMO.lede
        }
        action={
          isUnfilteredEmpty ? undefined : (
            <Button
              variant="primary"
              icon={<PlusIcon />}
              className="provider-admin-workspace-page__action"
              onClick={openCreateWizard}
            >
              {TENANT_SERVICE_ACCOUNTS_DEMO.createLabel}
            </Button>
          )
        }
      />

      {isUnfilteredEmpty ? (
        <EmptyState className="catalog-filter-empty provider-admin-organizations__empty">
          <Title headingLevel="h2" size="lg">
            {TENANT_SERVICE_ACCOUNTS_DEMO.emptyTitle}
          </Title>
          <EmptyStateBody className="catalog-filter-empty__body">
            {TENANT_SERVICE_ACCOUNTS_DEMO.emptyBody}
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="primary" icon={<PlusIcon />} onClick={openCreateWizard}>
                {TENANT_SERVICE_ACCOUNTS_DEMO.createLabel}
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      ) : (
        <>
          <div className="catalog-view-toolbar">
            <div className="catalog-view-toolbar__start">
              {!isDesign2 ? (
                <FormSelect
                  className="catalog-status-filter"
                  id="tenant-service-accounts-project-filter"
                  value={selectedProject}
                  onChange={(_event, value) =>
                    setSelectedProject(value as ServiceAccountProjectFilter)
                  }
                  aria-label="Filter by project"
                >
                  <FormSelectOption value="all" label="All Projects" />
                  {projects.map((project) => (
                    <FormSelectOption key={project.id} value={project.id} label={project.name} />
                  ))}
                </FormSelect>
              ) : null}
              <SearchInput
                className="catalog-search"
                placeholder="Search service accounts"
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
                aria-label="Search service accounts"
              />
            </div>
            <ViewModeToggle
              viewMode={viewMode}
              onChange={handleViewModeChange}
              idPrefix="service-accounts-view"
              ariaLabel="Service accounts view"
            />
          </div>

          {filteredAccounts.length === 0 ? (
            <CatalogFilterEmptyState
              title={TENANT_SERVICE_ACCOUNTS_DEMO.emptyFilteredTitle}
              description={
                isDesign2
                  ? 'Try a different search term, or clear filters.'
                  : TENANT_SERVICE_ACCOUNTS_DEMO.emptyFilteredBody
              }
              onClearFilters={clearAllFilters}
            />
          ) : viewMode === 'grid' ? (
            <>
              <CatalogFilterResultsSummary
                filteredCount={filteredAccounts.length}
                totalCount={accounts.length}
                singular="service account"
                filterParts={filterDescriptionParts}
                onClearFilters={clearAllFilters}
              />
              <div className="catalog-card-grid catalog-card-grid--stable tenant-admin-administration__grid">
                {filteredAccounts.map((account) => {
                  const status = getServiceAccountStatus(account)
                  const clientId = buildServiceAccountClientId(tenantSlug, account.name)
                  return (
                    <Card
                      key={account.id}
                      isCompact={false}
                      className="tenant-admin-administration__card"
                    >
                      <CardBody>
                        <div className="tenant-admin-administration__card-header">
                          <span className="tenant-admin-administration__card-icon" aria-hidden>
                            {renderInventoryCardIcon(SERVICE_ACCOUNT_CARD_ICON)}
                          </span>
                          <div className="tenant-admin-administration__card-header-actions">
                            <Label
                              color={
                                isDesign2 ? getServiceAccountStatusColor(status) : 'green'
                              }
                              isCompact
                              className="tenant-admin-administration__card-label"
                            >
                              {isDesign2
                                ? getServiceAccountStatusLabel(status)
                                : account.projectName}
                            </Label>
                            <ActionsColumn items={getRowActions(account)} />
                          </div>
                        </div>
                        <Content component="p" className="tenant-admin-administration__name-cell">
                          <Button
                            variant="link"
                            isInline
                            className="catalog-item-name-link"
                            onClick={() => setSelectedAccountId(account.id)}
                          >
                            {account.name}
                          </Button>
                        </Content>
                        <Content
                          component="p"
                          className="tenant-admin-administration__meta-cell tenant-admin-administration__card-email"
                        >
                          {isDesign2 ? clientId : account.description || '—'}
                        </Content>
                        <CatalogSpecRowsList
                          rows={[
                            isDesign2
                              ? {
                                  label: 'Status',
                                  value: getServiceAccountStatusLabel(status),
                                }
                              : {
                                  label: 'Keys',
                                  value: String(account.tokenSecretIds.length),
                                },
                            {
                              label: 'Created',
                              value: formatServiceAccountCreatedAt(account.createdAt),
                            },
                          ]}
                          className="tenant-admin-administration__specs-list"
                          rowClassName="tenant-admin-administration__spec-row"
                          labelClassName="tenant-admin-administration__spec-label"
                          valueClassName="tenant-admin-administration__spec-value"
                        />
                      </CardBody>
                    </Card>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="catalog-table-panel">
              <CatalogFilterResultsSummary
                filteredCount={filteredAccounts.length}
                totalCount={accounts.length}
                singular="service account"
                filterParts={filterDescriptionParts}
                onClearFilters={clearAllFilters}
              />
              <Table
                aria-label="Service accounts"
                className={[
                  'catalog-data-table',
                  'tenant-admin-administration__table',
                  isDesign2 ? 'tenant-admin-service-accounts__table--design2' : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <Thead>
                  <Tr>
                    <Th className="tenant-admin-administration__col-name">Name</Th>
                    {isDesign2 ? (
                      <Th className="tenant-admin-service-accounts__col-status">Status</Th>
                    ) : (
                      <Th>Project</Th>
                    )}
                    {isDesign2 ? (
                      <Th className="tenant-admin-service-accounts__col-client-id">Client ID</Th>
                    ) : (
                      <Th>Keys</Th>
                    )}
                    <Th className={isDesign2 ? 'tenant-admin-service-accounts__col-created' : undefined}>
                      Created
                    </Th>
                    <Th screenReaderText="Actions" />
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredAccounts.map((account) => {
                    const status = getServiceAccountStatus(account)
                    const clientId = buildServiceAccountClientId(tenantSlug, account.name)
                    return (
                      <Tr key={account.id}>
                        <Td dataLabel="Name" className="tenant-admin-administration__col-name">
                          <Content
                            component="p"
                            className="tenant-admin-administration__primary-cell"
                          >
                            <Button
                              variant="link"
                              isInline
                              className="catalog-table-name-link"
                              onClick={() => setSelectedAccountId(account.id)}
                            >
                              {account.name}
                            </Button>
                          </Content>
                          {!isDesign2 ? (
                            <Content
                              component="p"
                              className="tenant-admin-administration__meta-cell"
                            >
                              {account.description || '—'}
                            </Content>
                          ) : null}
                        </Td>
                        {isDesign2 ? (
                          <Td
                            dataLabel="Status"
                            className="tenant-admin-service-accounts__col-status"
                          >
                            <Label color={getServiceAccountStatusColor(status)} isCompact>
                              {getServiceAccountStatusLabel(status)}
                            </Label>
                          </Td>
                        ) : (
                          <Td dataLabel="Project">
                            <Label color="green" isCompact>
                              {account.projectName}
                            </Label>
                          </Td>
                        )}
                        {isDesign2 ? (
                          <Td
                            dataLabel="Client ID"
                            className="tenant-admin-service-accounts__col-client-id"
                          >
                            {clientId}
                          </Td>
                        ) : (
                          <Td dataLabel="Keys">{account.tokenSecretIds.length}</Td>
                        )}
                        <Td
                          dataLabel="Created"
                          className={
                            isDesign2 ? 'tenant-admin-service-accounts__col-created' : undefined
                          }
                        >
                          {formatServiceAccountCreatedAt(account.createdAt)}
                        </Td>
                        <Td isActionCell>
                          <ActionsColumn items={getRowActions(account)} />
                        </Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </div>
          )}
        </>
      )}
      {deleteModal}
      {design2Modals}
    </div>
  )
}
