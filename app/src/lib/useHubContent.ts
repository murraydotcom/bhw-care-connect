import { useEffect, useState } from 'react'
import { applyPublicSiteInformation, type PublicSiteInformation } from '../data/contact'
import type { Announcement } from '../data/news'

/** A downloadable/linkable resource shown on the hub (PDF, form, page). */
export interface HubResource {
  tag: string
  title: string
  body: string
  url: string
}

export interface HubContent {
  announcements: Announcement[]
  resources: HubResource[]
  siteInformation: PublicSiteInformation
  managedContentTypes: string[]
  updatedAt: string
  /** True only when at least one reviewed Google Cloud item is currently published. */
  ready: boolean
}

/** Announcement tags map to a tint so staff never have to touch CSS variables. */
const TAG_TINT: Record<string, string> = {
  Hours: 'var(--warning)',
  Blueprint: 'var(--accent)',
  Staff: 'var(--accent-3)',
  Program: 'var(--accent-2)',
  Insurance: 'var(--accent-3)',
  Form: 'var(--accent-2)',
  General: 'var(--accent-2)',
}

const ENDPOINT = '/.netlify/functions/hub-content'

/**
 * Pulls reviewed announcements, resources, and practice details from the
 * Google-backed CrewHQ Website Content workflow. On any failure the
 * hook simply returns empty arrays and `ready:false`, and callers fall back to
 * the built-in defaults compiled into the app.
 */
export function useHubContent(): HubContent {
  const [content, setContent] = useState<HubContent>({
    announcements: [],
    resources: [],
    siteInformation: {},
    managedContentTypes: [],
    updatedAt: '',
    ready: false,
  })

  useEffect(() => {
    let live = true
    fetch(ENDPOINT)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (!live) return
        const announcements: Announcement[] = (data.announcements || []).map(
          (a: Partial<Announcement>) => ({
            tag: a.tag || 'General',
            tint: TAG_TINT[a.tag || 'General'] || 'var(--accent-2)',
            date: a.date || '',
            title: a.title || '',
            body: a.body || '',
          }),
        )
        const resources: HubResource[] = (data.resources || []).filter(
          (r: HubResource) => r.title || r.url,
        )
        const siteInformation: PublicSiteInformation = data.siteInformation || {}
        const managedContentTypes: string[] = Array.isArray(data.managedContentTypes)
          ? data.managedContentTypes
          : []
        const updatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : ''
        const ready = data.available === true
        if (ready) applyPublicSiteInformation(
          siteInformation,
          managedContentTypes.includes('announcement') ? updatedAt : '',
        )
        setContent({ announcements, resources, siteInformation, managedContentTypes, updatedAt, ready })
      })
      .catch(() => {
        /* keep defaults — the app still works fully offline */
      })
    return () => {
      live = false
    }
  }, [])

  return content
}
