import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { getDesignHubTopicOptions } from '../designHub/topics'
import {
  buildDesignHubHomePath,
  getWorkspaceHubParam,
  getWorkspaceTopicParam,
} from '../shared/workspaceNavUrl'

/**
 * Prototype-only chrome: black top stripe + magenta “Back to home” pill.
 * When a topic has design alternatives, they appear centered in the stripe.
 */
export function DesignHubBackBanner() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  if (!getWorkspaceHubParam(searchParams)) {
    return null
  }

  const topicId = getWorkspaceTopicParam(searchParams)
  const designOptions = getDesignHubTopicOptions(topicId)

  return (
    <div className="bmaas-design-hub-banner" role="navigation" aria-label="Design hub">
      <div className="bmaas-design-hub-banner__start">
        <Link to={buildDesignHubHomePath(topicId)} className="bmaas-design-hub-banner__link">
          <span className="bmaas-design-hub-banner__arrow" aria-hidden>
            ←
          </span>
          <span>Back to home</span>
        </Link>
      </div>

      <div className="bmaas-design-hub-banner__center">
        {designOptions.length > 0 ? (
          <div
            className="bmaas-design-hub-banner__designs"
            role="group"
            aria-label="Design alternatives"
          >
            {designOptions.map((option) => {
              const isCurrent = option.isCurrent(location.pathname, searchParams)
              const isAvailable = Boolean(option.to || option.href)
              const className = [
                'bmaas-design-hub-banner__design',
                isCurrent ? 'bmaas-design-hub-banner__design--current' : null,
                !isAvailable ? 'bmaas-design-hub-banner__design--unavailable' : null,
              ]
                .filter(Boolean)
                .join(' ')

              if (option.to) {
                return (
                  <Link
                    key={option.key}
                    to={option.to}
                    className={className}
                    aria-current={isCurrent ? 'page' : undefined}
                    aria-label={`${option.label}${isCurrent ? ' (current)' : ''}`}
                  >
                    {option.label}
                  </Link>
                )
              }

              if (option.href) {
                return (
                  <a
                    key={option.key}
                    href={option.href}
                    className={className}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-current={isCurrent ? 'page' : undefined}
                    aria-label={`${option.label}${isCurrent ? ' (current)' : ''}`}
                  >
                    {option.label}
                  </a>
                )
              }

              return (
                <span
                  key={option.key}
                  className={className}
                  aria-disabled="true"
                  title="Not available yet"
                >
                  {option.label}
                </span>
              )
            })}
          </div>
        ) : null}
      </div>

      <div className="bmaas-design-hub-banner__end" aria-hidden />
    </div>
  )
}
