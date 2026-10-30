import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getWorkspaceWidthParam, WORKSPACE_WIDTH_FULL } from './workspaceNavUrl'

const WIZARD_WIDTH_DATASET_KEY = 'wizardWidth'

/**
 * Applies `?width=full|max` to the document so all persona wizards share the
 * same content-width comparison mode while the param stays in the URL.
 */
export function useWorkspaceWizardWidth() {
  const [searchParams] = useSearchParams()
  const widthMode = getWorkspaceWidthParam(searchParams)

  useEffect(() => {
    const root = document.documentElement
    if (widthMode === WORKSPACE_WIDTH_FULL) {
      root.dataset[WIZARD_WIDTH_DATASET_KEY] = WORKSPACE_WIDTH_FULL
    } else if (widthMode) {
      root.dataset[WIZARD_WIDTH_DATASET_KEY] = widthMode
    } else {
      delete root.dataset[WIZARD_WIDTH_DATASET_KEY]
    }

    return () => {
      delete root.dataset[WIZARD_WIDTH_DATASET_KEY]
    }
  }, [widthMode])
}
