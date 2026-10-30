import {
  Brand,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  Title,
} from '@patternfly/react-core'
import { css } from '@patternfly/react-styles'
import alignmentStyles from '@patternfly/react-styles/css/utilities/Alignment/alignment'
import { BlueprintIcon } from '@patternfly/react-icons/dist/esm/icons/blueprint-icon'
import { OutlinedClockIcon } from '@patternfly/react-icons/dist/esm/icons/outlined-clock-icon'
import { UserIcon } from '@patternfly/react-icons/dist/esm/icons/user-icon'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RouterButton } from '../components/RouterButton'
import { BMAAS_LANDING_LAST_UPDATED } from '../bmaasLandingLastUpdated'
import {
  buildProviderCreateCatalogItemPath,
  getLandingFocusTopicParam,
  LANDING_FOCUS_TOPIC_PARAM,
  withDesignHubParam,
  WORKSPACE_WIDTH_FULL,
  WORKSPACE_WIDTH_MAX,
} from '../shared/workspaceNavUrl'
import redHatHatLogoUrl from '../assets/Logo-RedHat-Hat-Color-RGB.svg?url'

const TOPIC_CATALOG_ITEM_CREATION = 'catalog-item-creation'
const TOPIC_FULL_VS_MAX_WIDTH = 'full-vs-max-width'

type DesignOption = {
  id: string
  label: string
  to?: string
}

type TopicCard = {
  id: string
  title: string
  description: string
  status: string
  jira?: {
    key: string
    href: string
  }
  authors: string
  updated: string
  personas: string[]
  designs: DesignOption[]
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
  jira,
  authors,
  updated,
  personas,
  designs,
  isFocused = false,
}: TopicCard & { isFocused?: boolean }) {
  return (
    <Card
      isFullHeight
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
            <Label variant="outline" color="grey">
              {status}
            </Label>
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
        <ul className="bmaas-landing-topic-card__attribution">
          <li>
            <UserIcon aria-hidden />
            <span>By {authors}</span>
          </li>
          <li>
            <OutlinedClockIcon aria-hidden />
            <span>{updated}</span>
          </li>
        </ul>
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

export function BmaasLandingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const focusTopicFromUrl = getLandingFocusTopicParam(searchParams)
  const [focusedTopicId, setFocusedTopicId] = useState<string | null>(focusTopicFromUrl)

  const topics: TopicCard[] = [
    {
      id: TOPIC_CATALOG_ITEM_CREATION,
      title: 'Catalog item creation flow',
      description: 'Compare alternative designs for creating a catalog item.',
      status: 'Draft',
      jira: {
        key: 'HPUX-2369',
        href: 'https://redhat.atlassian.net/browse/HPUX-2369',
      },
      authors: 'Ethan Kim',
      updated: BMAAS_LANDING_LAST_UPDATED,
      personas: ['Provider Admin'],
      designs: [
        {
          id: 'bmaas-landing-design-catalog-item-1',
          label: 'Design 1',
          to: withDesignHubParam(
            '/provider/workspace?nav=catalog',
            TOPIC_CATALOG_ITEM_CREATION,
          ),
        },
        {
          id: 'bmaas-landing-design-catalog-item-2',
          label: 'Design 2',
        },
        {
          id: 'bmaas-landing-design-catalog-item-3',
          label: 'Design 3',
        },
      ],
    },
    {
      id: TOPIC_FULL_VS_MAX_WIDTH,
      title: 'Full width vs. Max width',
      description:
        'Compare wizard content width: Design 1 uses the previous full width; Design 2 uses the new max/min width.',
      status: 'Draft',
      authors: 'Ethan Kim',
      updated: BMAAS_LANDING_LAST_UPDATED,
      personas: ['Provider Admin', 'Tenant Admin', 'Tenant User'],
      designs: [
        {
          id: 'bmaas-landing-design-width-1',
          label: 'Design 1',
          to: buildProviderCreateCatalogItemPath({
            width: WORKSPACE_WIDTH_FULL,
            service: 'baremetal',
            step: 'hardware',
            topic: TOPIC_FULL_VS_MAX_WIDTH,
          }),
        },
        {
          id: 'bmaas-landing-design-width-2',
          label: 'Design 2',
          to: buildProviderCreateCatalogItemPath({
            width: WORKSPACE_WIDTH_MAX,
            service: 'baremetal',
            step: 'hardware',
            topic: TOPIC_FULL_VS_MAX_WIDTH,
          }),
        },
      ],
    },
  ]

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
    <Bullseye className="bmaas-role-landing">
      <Flex
        className="bmaas-role-landing__wrap"
        direction={{ default: 'column' }}
        alignItems={{ default: 'alignItemsCenter' }}
        gap={{ default: 'gap2xl' }}
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
            <Brand src={redHatHatLogoUrl} alt="Red Hat" heights={{ default: '52px' }} />
            <Title headingLevel="h1" size="4xl">
              Red Hat Cloud Extensions Design Lab
            </Title>
            <Content component="p">Compare design alternatives by topic.</Content>
          </Flex>
        </FlexItem>

        <FlexItem alignSelf={{ default: 'alignSelfStretch' }}>
          <Flex
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
                In progress
              </Title>
              <span className="bmaas-landing-section-count" aria-label={`${topics.length} topics`}>
                {topics.length}
              </span>
            </Flex>

            <div className="bmaas-landing-topic-grid">
              {topics.map((topic) => (
                <TopicDesignCard
                  key={topic.id}
                  {...topic}
                  isFocused={focusedTopicId === topic.id}
                />
              ))}
            </div>
          </Flex>
        </FlexItem>

        <FlexItem>
          <Flex
            component="footer"
            direction={{ default: 'column' }}
            alignItems={{ default: 'alignItemsCenter' }}
            gap={{ default: 'gapMd' }}
            className={css(alignmentStyles.textAlignCenter)}
          >
            <div className="bmaas-role-landing__credits">
              <Content component="p">
                Created by{' '}
                <Button
                  variant="link"
                  component="a"
                  isInline
                  href="https://redhat.enterprise.slack.com/archives/D021Q4YKTBR"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ethan Kim
                </Button>
                {' - OpenShift UXD'}
              </Content>
            </div>
          </Flex>
        </FlexItem>
      </Flex>
    </Bullseye>
  )
}
