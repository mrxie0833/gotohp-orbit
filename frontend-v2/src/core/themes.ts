export const THEMES = [
  { id: 'graphite', label: 'Graphite', swatch: ['#16181d', '#7c9cff'] },
  { id: 'ocean', label: 'Ocean', swatch: ['#0b1a24', '#38bdf8'] },
  { id: 'moss', label: 'Moss', swatch: ['#12190f', '#8fd16a'] },
  { id: 'ember', label: 'Ember', swatch: ['#1c1411', '#ff8a4c'] },
  { id: 'orchid', label: 'Orchid', swatch: ['#1a1220', '#c58bff'] },
  { id: 'paper', label: 'Paper', swatch: ['#f6f4ef', '#2f6bff'] },
] as const

export type ThemeId = (typeof THEMES)[number]['id']
export type ThemeChoice = ThemeId | 'auto'

const KEY = 'orbit.theme'

export function savedTheme(): ThemeChoice {
  const v = localStorage.getItem(KEY)
  return v === 'auto' || THEMES.some(t => t.id === v) ? (v as ThemeChoice) : 'graphite'
}

export function applyTheme(choice: ThemeChoice) {
  localStorage.setItem(KEY, choice)
  const light = window.matchMedia('(prefers-color-scheme: light)').matches
  const id: ThemeId = choice === 'auto' ? (light ? 'paper' : 'graphite') : choice
  document.documentElement.dataset.theme = id
  document.documentElement.style.colorScheme = id === 'paper' ? 'light' : 'dark'
}

/** Keeps "auto" in step with the OS. Returns a stop function. */
export function watchSystemTheme(get: () => ThemeChoice) {
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const on = () => get() === 'auto' && applyTheme('auto')
  mq.addEventListener('change', on)
  return () => mq.removeEventListener('change', on)
}
