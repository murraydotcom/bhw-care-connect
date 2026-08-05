import { useCallback, useEffect, useState } from 'react'

export type PageName = 'hub' | 'resources' | 'new-patients'

/**
 * Hash routing, deliberately: the built site drops onto any static host — a
 * sub-path, S3, GitHub Pages — with no server rewrite rules, and the back
 * button and shareable links still work.
 *
 *   #/              the Care Connect hub
 *   #/resources     the Ask NP Am resource library
 *   #/new-patients  the New Patients guide
 */
function pageFromHash(): PageName {
  const slug = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  if (slug === 'resources') return 'resources'
  if (slug === 'new-patients') return 'new-patients'
  return 'hub'
}

export function useHashRoute() {
  const [page, setPage] = useState<PageName>(() =>
    typeof window === 'undefined' ? 'hub' : pageFromHash(),
  )

  useEffect(() => {
    const onHashChange = () => {
      setPage(pageFromHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((next: PageName) => {
    const hash = next === 'hub' ? '#/' : `#/${next}`
    if (window.location.hash === hash) {
      window.scrollTo(0, 0)
      return
    }
    window.location.hash = hash // the hashchange listener handles the rest
  }, [])

  return { page, navigate }
}
