import { reactive } from 'vue'
import { ConfigManager } from '@bindings/app/core'
import { toast } from '@/ui/toast'

export interface Identity {
  email: string
  needsKey: boolean
}

export const identities = reactive<{ list: Identity[]; active: string; loaded: boolean }>({
  list: [],
  active: '',
  loaded: false,
})

const pending = new Map<string, ReturnType<typeof setTimeout>>()
const UNDO_MS = 5000

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e))

export async function loadIdentities() {
  try {
    const s = await ConfigManager.GetAccounts()
    identities.list = s.accounts
      .filter(a => !pending.has(a.email))
      .map(a => ({ email: a.email, needsKey: a.needsTokenBinding }))
    identities.active = s.selected && !pending.has(s.selected) ? s.selected : identities.list[0]?.email ?? ''
  } catch (e) {
    toast.error('Could not load identities', reason(e))
  } finally {
    identities.loaded = true
  }
}

export async function activate(email: string) {
  const previous = identities.active
  identities.active = email
  try {
    await ConfigManager.SetSelected(email)
  } catch (e) {
    identities.active = previous
    toast.error('Could not switch identity', reason(e))
  }
}

/** Hides the identity now, deletes it for real after the undo window closes. */
export function removeWithUndo(email: string) {
  const index = identities.list.findIndex(i => i.email === email)
  if (index < 0) return
  const [gone] = identities.list.splice(index, 1)
  const wasActive = identities.active === email
  if (wasActive) identities.active = identities.list[0]?.email ?? ''

  const commit = async () => {
    pending.delete(email)
    try {
      await ConfigManager.RemoveCredentials(email)
      await loadIdentities()
      if (identities.active) await ConfigManager.SetSelected(identities.active)
    } catch (e) {
      toast.error('Could not remove identity', reason(e))
      await loadIdentities()
    }
  }
  pending.set(email, setTimeout(commit, UNDO_MS))

  toast.info(`Removed ${email}`, undefined, {
    label: 'Undo',
    run: () => {
      const timer = pending.get(email)
      if (timer) clearTimeout(timer)
      pending.delete(email)
      identities.list.splice(Math.min(index, identities.list.length), 0, gone)
      if (wasActive) identities.active = email
    },
    durationMs: UNDO_MS,
  })
}

export async function linkKeyFromPhone(email: string) {
  try {
    await ConfigManager.AddTokenBindingAliasFromADB(email)
    await loadIdentities()
    toast.success('Key linked')
    return true
  } catch (e) {
    toast.error('Could not read the key from your phone', reason(e))
    return false
  }
}

export async function connectWithToken(token: string) {
  const email = await ConfigManager.AddGoogleAccount(token.trim())
  await loadIdentities()
  return email
}

export async function connectWithRaw(credential: string) {
  await ConfigManager.AddCredentials(credential.trim())
  await loadIdentities()
}
