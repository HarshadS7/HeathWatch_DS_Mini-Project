import { useEffect, useState } from 'react'

/** Tracks the data-theme attribute on <html> (set by the theme toggle). */
export function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.dataset.theme === 'dark'))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return dark
}
