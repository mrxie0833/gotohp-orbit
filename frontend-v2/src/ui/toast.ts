import { reactive } from 'vue'

export type ToastKind = 'info' | 'success' | 'error'
export interface ToastAction {
  label: string
  run: () => void
  durationMs?: number
}
export interface ToastItem {
  id: number
  kind: ToastKind
  title: string
  description?: string
  action?: ToastAction
}

export const toasts = reactive<ToastItem[]>([])
const MAX_VISIBLE = 3
let seq = 0

export function dismiss(id: number) {
  const i = toasts.findIndex(t => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}

function push(kind: ToastKind, title: string, description?: string, action?: ToastAction) {
  const id = ++seq
  toasts.push({ id, kind, title, description, action })
  while (toasts.length > MAX_VISIBLE) toasts.shift()
  const ms = action?.durationMs ?? (kind === 'error' ? 6000 : 3200)
  setTimeout(() => dismiss(id), ms)
  return id
}

export const toast = {
  info: (title: string, description?: string, action?: ToastAction) => push('info', title, description, action),
  success: (title: string, description?: string) => push('success', title, description),
  error: (title: string, description?: string) => push('error', title, description),
}
