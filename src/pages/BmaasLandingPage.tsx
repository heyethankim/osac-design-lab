import {
  Brand,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  List,
  ListItem,
  SearchInput,
  Title,
} from '@patternfly/react-core'
import { css } from '@patternfly/react-styles'
import alignmentStyles from '@patternfly/react-styles/css/utilities/Alignment/alignment'
import { BlueprintIcon } from '@patternfly/react-icons/dist/esm/icons/blueprint-icon'
import { SearchIcon } from '@patternfly/react-icons/dist/esm/icons/search-icon'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ViewModeToggle } from '../components/catalog/CatalogViewToggle'
import { RouterButton } from '../components/RouterButton'
import { BMAAS_LANDING_LAST_UPDATED } from '../bmaasLandingLastUpdated'
import {
  getLandingViewMode,
  setLandingViewMode,
  type ViewMode,
} from '../catalog/viewMode'
import {
  DESIGN_HUB_TOPIC_OPTIONS,
  TOPIC_CATALOG_ITEM_CREATION,
  TOPIC_EXTERNAL_BILLING_ID,
  TOPIC_FULL_VS_MAX_WIDTH,
  TOPIC_MULTI_SERVICE_CATALOG,
  TOPIC_NAVIGATION_STRUCTURE,
  TOPIC_SERVICE_ACCOUNTS,
} from '../designHub/topics'
import {
  getLandingFocusTopicParam,
  LANDING_FOCUS_TOPIC_PARAM,
} from '../shared/workspaceNavUrl'
import redHatHatLogoUrl from '../assets/Logo-RedHat-Hat-Color-RGB.svg?url'

type TopicStatus = 'In progress' | 'In review' | 'Draft'

const TOPIC_STATUS_SECTIONS: readonly TopicStatus[] = ['In review', 'In progress', 'Draft']

const LANDING_RESOURCES = [
  {
    id: 'red-hat-icons',
    label: 'Red Hat icons',
    href: 'https://red-hat-icons.netlify.app/',
  },
] as const

type DesignOption = {
  id: string
  label: string
  to?: string
  href?: string
}

function designsForTopic(topicId: string): DesignOption[] {
  return (DESIGN_HUB_TOPIC_OPTIONS[topicId] ?? []).map((design) => ({
    id: `bmaas-landing-design-${topicId}-${design.key}`,
    label: design.label,
    to: design.to,
    href: design.href,
  }))
}

type TopicCard = {
  id: string
  title: string
  description: string
  status: TopicStatus
  /** Topic implements or extends the Golden / canonical PatternFly UI pattern. */
  isGoldPattern?: boolean
  /** Omit from landing sections while keeping the topic definition for later. */
  hidden?: boolean
  jira?: {
    key: string
    href: string
  }
  /** Shown above author attribution on topic cards. */
  fixVersion?: string
  authors: string
  updated: string
  personas: string[]
  designs: DesignOption[]
}

const LANDING_TOPICS: TopicCard[] = [
  {
    id: TOPIC_MULTI_SERVICE_CATALOG,
    title: 'Multi-service catalog',
    description:
      'Compare Tenant Admin catalog designs for offerings across bare metal, clusters, virtual machines, and models.',
    status: 'In progress',
    fixVersion: '0.4',
    authors: 'Ethan Kim',
    updated: BMAAS_LANDING_LAST_UPDATED,
    personas: ['Tenant Admin'],
    designs: designsForTopic(TOPIC_MULTI_SERVICE_CATALOG),
  },
  {
    id: TOPIC_EXTERNAL_BILLING_ID,
    title: 'External billing ID',
    description:
      'Compare Provider Admin designs for capturing and showing an optional external billing identifier on tenants.',
    status: 'In progress',
    jira: {
      key: 'OSAC-6161',
      href: 'https://redhat.atlassian.net/browse/OSAC-6161',
    },
    fixVersion: '0.4',
    authors: 'Ethan Kim',
    updated: BMAAS_LANDING_LAST_UPDATED,
    personas: ['Provider Admin'],
    designs: designsForTopic(TOPIC_EXTERNAL_BILLING_ID),
  },
  {
    id: TOPIC_SERVICE_ACCOUNTS,
    title: 'Service accounts',
    description:
      'Compare Tenant Admin designs for non-human identities, credentials, and role access.',
    status: 'In progress',
    jira: {
      key: 'OSAC-5149',
      href: 'https://redhat.atlassian.net/browse/OSAC-5149',
    },
    fixVersion: '0.4',
    authors: 'Ethan Kim',
    updated: BMAAS_LANDING_LAST_UPDATED,
    personas: ['Tenant Admin'],
    designs: designsForTopic(TOPIC_SERVICE_ACCOUNTS),
  },
  {
    id: TOPIC_NAVIGATION_STRUCTURE,
    title: 'Navigation structure',
    description:
      'Side-by-side navigation by persona for Cloud Extensions (previously OSAC). Pages are read-only for the dev preview.',
    status: 'In review',
    isGoldPattern: true,
    fixVersion: '0.4',
    authors: 'Ethan Kim',
    updated: BMAAS_LANDING_LAST_UPDATED,
    personas: ['Provider Admin', 'Tenant Admin', 'Tenant User', 'IdP Manager'],
    designs: designsForTopic(TOPIC_NAVIGATION_STRUCTURE),
  },
  {
    id: TOPIC_CATALOG_ITEM_CREATION,
    title: 'Catalog item creation flow',
    description: 'Compare alternative designs for creating a catalog item.',
    status: 'In progress',
    isGoldPattern: true,
    hidden: true,
    authors: 'Ethan Kim',
    updated: BMAAS_LANDING_LAST_UPDATED,
    personas: ['Provider Admin'],
    designs: designsForTopic(TOPIC_CATALOG_ITEM_CREATION),
  },
  {
    id: TOPIC_FULL_VS_MAX_WIDTH,
    title: 'Full width vs. Max width',
    description:
      'Compare wizard content width: Design 1 uses the previous full width; Design 2 uses the new max/min width.',
    status: 'In review',
    isGoldPattern: true,
    fixVersion: '0.4',
    authors: 'Ethan Kim',
    updated: BMAAS_LANDING_LAST_UPDATED,
    personas: ['Provider Admin', 'Tenant Admin', 'Tenant User', 'IdP Manager'],
    designs: designsForTopic(TOPIC_FULL_VS_MAX_WIDTH),
  },
]

function topicSearchHaystack(topic: TopicCard): string {
  return [
    topic.title,
    topic.description,
    topic.status,
    topic.fixVersion ? `fix version ${topic.fixVersion}` : '',
    topic.authors,
    topic.updated,
    topic.jira?.key,
    topic.isGoldPattern ? 'golden pattern' : '',
    ...topic.personas,
    ...topic.designs.map((design) => design.label),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function topicMatchesQuery(topic: TopicCard, query: string): boolean {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (tokens.length === 0) {
    return true
  }
  const haystack = topicSearchHaystack(topic)
  return tokens.every((token) => haystack.includes(token))
}

function DesignLinks({ title, designs }: { title: string; designs: DesignOption[] }) {
  return (
    <ul className="bmaas-landing-topic-card__links">
      {designs.map((design) => (
        <li key={design.id}>
          {design.to ? (
            <RouterButton
              variant="link"
              isInline
              to={design.to}
              icon={<BlueprintIcon />}
              aria-label={`${title}: ${design.label}`}
            >
              {design.label}
            </RouterButton>
          ) : design.href ? (
            <Button
              variant="link"
              component="a"
              isInline
              href={design.href}
              target="_blank"
              rel="noopener noreferrer"
              icon={<BlueprintIcon />}
              aria-label={`${title}: ${design.label}`}
            >
              {design.label}
            </Button>
          ) : (
            <span className="bmaas-landing-topic-card__link-muted">
              <BlueprintIcon aria-hidden />
              {design.label}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function TopicDesignCard({
  id,
  title,
  description,
  status,
  isGoldPattern = false,
  jira,
  fixVersion,
  authors,
  updated,
  personas,
  designs,
  isFocused = false,
}: TopicCard & { isFocused?: boolean }) {
  return (
    <Card
      component="article"
      id={`topic-${id}`}
      className={css(
        'bmaas-landing-topic-card',
        isFocused && 'bmaas-landing-topic-card--focus',
      )}
      aria-labelledby={id}
    >
      <CardTitle>
        <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsCenter' }}
            gap={{ default: 'gapSm' }}
            className="bmaas-landing-topic-card__meta"
          >
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              gap={{ default: 'gapSm' }}
              flexWrap={{ default: 'wrap' }}
            >
              <Label variant="outline" color="grey">
                {status}
              </Label>
              {isGoldPattern ? (
                <Label variant="outline" color="yellow">
                  Golden pattern
                </Label>
              ) : null}
            </Flex>
            {jira ? (
              <Button
                variant="link"
                component="a"
                isInline
                href={jira.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bmaas-landing-topic-card__jira"
                aria-label={`Jira ${jira.key}`}
              >
                {jira.key}
              </Button>
            ) : null}
          </Flex>
          <Title id={id} headingLevel="h3" size="lg" className="bmaas-landing-topic-card__title">
            {title}
          </Title>
        </Flex>
      </CardTitle>
      <CardBody className="bmaas-landing-topic-card__body">
        <Content component="p" className="bmaas-landing-topic-card__description">
          {description}
        </Content>
        <DesignLinks title={title} designs={designs} />
        <p className="bmaas-landing-topic-card__attribution">
          {[
            fixVersion ? `Fix version ${fixVersion}` : null,
            authors,
            updated,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <LabelGroup className="bmaas-landing-topic-card__personas" numLabels={4}>
          {personas.map((persona) => (
            <Label key={persona} color="grey">
              {persona}
            </Label>
          ))}
        </LabelGroup>
      </CardBody>
    </Card>
  )
}

function TopicListRow({
  topic,
  isFocused = false,
}: {
  topic: TopicCard
  isFocused?: boolean
}) {
  return (
    <Tr
      id={`topic-${topic.id}`}
      className={css(
        'bmaas-landing-topic-row',
        isFocused && 'bmaas-landing-topic-card--focus',
      )}
    >
      <Td dataLabel="Topic">
        <Flex direction={{ default: 'column' }} gap={{ default: 'gapXs' }}>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            gap={{ default: 'gapSm' }}
            flexWrap={{ default: 'wrap' }}
          >
            <Title
              id={topic.id}
              headingLevel="h3"
              size="md"
              className="bmaas-landing-topic-card__title"
            >
              {topic.title}
            </Title>
            {topic.isGoldPattern ? (
              <Label variant="outline" color="yellow">
                Golden pattern
              </Label>
            ) : null}
            {topic.jira ? (
              <Button
                variant="link"
                component="a"
                isInline
                href={topic.jira.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bmaas-landing-topic-card__jira"
                aria-label={`Jira ${topic.jira.key}`}
              >
                {topic.jira.key}
              </Button>
            ) : null}
          </Flex>
          <Content component="p" className="bmaas-landing-topic-card__description">
            {topic.description}
          </Content>
        </Flex>
      </Td>
      <Td dataLabel="Personas">
        <LabelGroup numLabels={4}>
          {topic.personas.map((persona) => (
            <Label key={persona} color="grey">
              {persona}
            </Label>
          ))}
        </LabelGroup>
      </Td>
      <Td dataLabel="Designs">
        <DesignLinks title={topic.title} designs={topic.designs} />
      </Td>
      <Td dataLabel="Updated">
        <span className="bmaas-landing-topic-row__updated">{topic.updated}</span>
      </Td>
    </Tr>
  )
}

export function BmaasLandingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const focusTopicFromUrl = getLandingFocusTopicParam(searchParams)
  const [focusedTopicId, setFocusedTopicId] = useState<string | null>(focusTopicFromUrl)
  const [searchValue, setSearchValue] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(() => getLandingViewMode())

  const filteredTopics = useMemo(
    () =>
      LANDING_TOPICS.filter(
        (topic) => !topic.hidden && topicMatchesQuery(topic, searchValue),
      ),
    [searchValue],
  )

  const topicsByStatus = TOPIC_STATUS_SECTIONS.map((status) => ({
    status,
    topics: filteredTopics.filter((topic) => topic.status === status),
  })).filter((section) => section.topics.length > 0)

  const handleViewModeChange = (nextViewMode: ViewMode) => {
    setViewMode(nextViewMode)
    setLandingViewMode(nextViewMode)
  }

  useEffect(() => {
    if (!focusTopicFromUrl) {
      return
    }

    setFocusedTopicId(focusTopicFromUrl)
    const card = document.getElementById(`topic-${focusTopicFromUrl}`)
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    const clearFocusParam = window.setTimeout(() => {
      setSearchParams(
        (current) => {
          if (!current.has(LANDING_FOCUS_TOPIC_PARAM)) {
            return current
          }
          const next = new URLSearchParams(current)
          next.delete(LANDING_FOCUS_TOPIC_PARAM)
          return next
        },
        { replace: true },
      )
    }, 400)

    const clearHighlight = window.setTimeout(() => {
      setFocusedTopicId(null)
    }, 2800)

    return () => {
      window.clearTimeout(clearFocusParam)
      window.clearTimeout(clearHighlight)
    }
  }, [focusTopicFromUrl, setSearchParams])

  return (
    <div className="bmaas-role-landing">
      <Flex
        className="bmaas-role-landing__wrap"
        direction={{ default: 'column' }}
        alignItems={{ default: 'alignItemsCenter' }}
        gap={{ default: 'gapLg' }}
        flexWrap={{ default: 'nowrap' }}
      >
        <FlexItem>
          <Flex
            component="header"
            direction={{ default: 'column' }}
            alignItems={{ default: 'alignItemsCenter' }}
            gap={{ default: 'gapMd' }}
            className={css(alignmentStyles.textAlignCenter)}
          >
            <Brand src={redHatHatLogoUrl} alt="Red Hat" heights={{ default: '40px' }} />
            <Title headingLevel="h1" size="4xl">
              Red Hat Cloud Extensions Design Lab
            </Title>
            <Content component="p">Compare design alternatives by topic.</Content>
          </Flex>
        </FlexItem>

        <FlexItem alignSelf={{ default: 'alignSelfStretch' }} className="bmaas-landing-main">
          <div className="catalog-view-toolbar bmaas-landing-toolbar">
            <div className="catalog-view-toolbar__start">
              <SearchInput
                className="catalog-search bmaas-landing-search"
                placeholder="Search topics, personas, Jira…"
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
                aria-label="Search design topics"
                resultsCount={searchValue.trim() ? filteredTopics.length : undefined}
              />
            </div>
            <ViewModeToggle
              viewMode={viewMode}
              onChange={handleViewModeChange}
              ariaLabel="Topic view"
              idPrefix="landing-view"
            />
          </div>

          <div className="bmaas-landing-results" aria-live="polite">
            {filteredTopics.length === 0 ? (
              <EmptyState className="bmaas-landing-empty osac-standard-empty">
                <span className="osac-standard-empty__icon" aria-hidden>
                  <SearchIcon />
                </span>
                <Title headingLevel="h2" size="lg">
                  No topics match your search
                </Title>
                <EmptyStateBody>
                  Try a different topic name, persona, status, or Jira key.
                </EmptyStateBody>
                <Button variant="link" onClick={() => setSearchValue('')}>
                  Clear search
                </Button>
              </EmptyState>
            ) : (
              <Flex
                direction={{ default: 'column' }}
                gap={{ default: 'gapXl' }}
                fullWidth={{ default: 'fullWidth' }}
              >
                {topicsByStatus.map(({ status, topics: sectionTopics }) => (
                  <Flex
                    key={status}
                    direction={{ default: 'column' }}
                    gap={{ default: 'gapLg' }}
                    fullWidth={{ default: 'fullWidth' }}
                  >
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      gap={{ default: 'gapSm' }}
                      className="bmaas-landing-section-heading"
                    >
                      <Title headingLevel="h2" size="xl">
                        {status}
                      </Title>
                      <span
                        className="bmaas-landing-section-count"
                        aria-label={`${sectionTopics.length} topics`}
                      >
                        {sectionTopics.length}
                      </span>
                    </Flex>

                    {viewMode === 'list' ? (
                      <Table
                        aria-label={`${status} design topics`}
                        variant="compact"
                        className="bmaas-landing-topic-table"
                      >
                        <Thead>
                          <Tr>
                            <Th width={40}>Topic</Th>
                            <Th width={20}>Personas</Th>
                            <Th width={30}>Designs</Th>
                            <Th width={10}>Updated</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {sectionTopics.map((topic) => (
                            <TopicListRow
                              key={topic.id}
                              topic={topic}
                              isFocused={focusedTopicId === topic.id}
                            />
                          ))}
                        </Tbody>
                      </Table>
                    ) : (
                      <div className="bmaas-landing-topic-grid">
                        {sectionTopics.map((topic) => (
                          <TopicDesignCard
                            key={topic.id}
                            {...topic}
                            isFocused={focusedTopicId === topic.id}
                          />
                        ))}
                      </div>
                    )}
                  </Flex>
                ))}
              </Flex>
            )}
          </div>
        </FlexItem>

        <FlexItem alignSelf={{ default: 'alignSelfStretch' }} className="bmaas-landing-resources">
          <Flex
            direction={{ default: 'column' }}
            gap={{ default: 'gapLg' }}
            fullWidth={{ default: 'fullWidth' }}
          >
            <Title headingLevel="h2" size="xl">
              Resources
            </Title>
            <List className="bmaas-landing-resources__list">
              {LANDING_RESOURCES.map((resource) => (
                <ListItem key={resource.id}>
                  <Button
                    variant="link"
                    component="a"
                    isInline
                    href={resource.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${resource.label} (opens in a new tab)`}
                  >
                    {resource.label}
                  </Button>
                </ListItem>
              ))}
            </List>
          </Flex>
        </FlexItem>
      </Flex>
    </div>
  )
}
