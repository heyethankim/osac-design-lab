import { Link, useSearchParams } from 'react-router-dom'
import {
  buildDesignHubHomePath,
  getWorkspaceHubParam,
  getWorkspaceTopicParam,
} from '../shared/workspaceNavUrl'

/**
 * Prototype-only chrome: black top stripe + magenta “Back to home” pill.
 * Renders in document flow so masthead/brand layout stays intact.
 */
export function DesignHubBackBanner() {
  const [searchParams] = useSearchParams()
  if (!getWorkspaceHubParam(searchParams)) {
    return null
  }

  const topicId = getWorkspaceTopicParam(searchParams)

  return (
    <div className="bmaas-design-hub-banner" role="navigation" aria-label="Design hub">
      <Link to={buildDesignHubHomePath(topicId)} className="bmaas-design-hub-banner__link">
        Back to home
      </Link>
    </div>
  )
}
