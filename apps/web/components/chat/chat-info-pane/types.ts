export const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

export type PaneView = 'overview' | 'members' | 'photos' | 'files' | 'links' | 'settings'

export const slideVariants = {
  enterForward: { x: '100%', opacity: 0 },
  enterBack: { x: '-30%', opacity: 0 },
  center: { x: 0, opacity: 1 },
  exitForward: { x: '-30%', opacity: 0 },
  exitBack: { x: '100%', opacity: 0 },
}

export function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
