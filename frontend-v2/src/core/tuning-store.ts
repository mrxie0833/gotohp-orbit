import { reactive, watch } from 'vue'
import { ConfigManager } from '@bindings/app/core'
import { toast } from '@/ui/toast'

export interface Tuning {
  threads: number
  useQuota: boolean
  saver: boolean
  recursive: boolean
  forceUpload: boolean
  pairLive: boolean
  holdLoneHalves: boolean
  promoteStills: boolean
  eraseOriginals: boolean
  anyFileType: boolean
  dateFromName: boolean
  ignore: string
  proxy: string
}

export const tuning = reactive<Tuning>({
  threads: 1,
  useQuota: false,
  saver: false,
  recursive: false,
  forceUpload: false,
  pairLive: false,
  holdLoneHalves: true,
  promoteStills: false,
  eraseOriginals: false,
  anyFileType: false,
  dateFromName: false,
  ignore: '',
  proxy: '',
})

let hydrating = true
const timers = new Map<string, ReturnType<typeof setTimeout>>()

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e))
const guard = async (fn: () => Promise<unknown>) => {
  try {
    await fn()
  } catch (e) {
    toast.error('Could not save that change', reason(e))
  }
}

function debounced(key: string, fn: () => Promise<unknown>, ms = 450) {
  const t = timers.get(key)
  if (t) clearTimeout(t)
  timers.set(key, setTimeout(() => guard(fn), ms))
}

export async function loadTuning() {
  hydrating = true
  try {
    const c = await ConfigManager.GetSettings()
    Object.assign(tuning, {
      threads: c.uploadThreads || 1,
      useQuota: !!c.useQuota,
      saver: !!c.saver,
      recursive: !!c.recursive,
      forceUpload: !!c.forceUpload,
      pairLive: !!c.pairLivePhotos,
      holdLoneHalves: c.skipIncompleteLivePhotos ?? true,
      promoteStills: !!c.updateExistingPhotosToLive,
      eraseOriginals: !!c.deleteFromHost,
      anyFileType: !!c.disableUnsupportedFilesFilter,
      dateFromName: !!c.setDateFromFilename,
      ignore: c.excludePattern || '',
      proxy: c.proxy || '',
    })
  } catch (e) {
    toast.error('Could not load tuning', reason(e))
  } finally {
    // Let the watchers below see the hydrated values before they start saving.
    queueMicrotask(() => setTimeout(() => (hydrating = false), 0))
  }
}

function persist<K extends keyof Tuning>(key: K, save: (v: Tuning[K]) => Promise<unknown>, wait = 0) {
  watch(
    () => tuning[key],
    v => {
      if (hydrating) return
      if (wait) debounced(String(key), () => save(v), wait)
      else guard(() => save(v))
    },
  )
}

persist('threads', v => (v >= 1 ? ConfigManager.SetUploadThreads(v) : Promise.resolve()), 250)
persist('useQuota', v => ConfigManager.SetUseQuota(v))
persist('saver', v => ConfigManager.SetSaver(v))
persist('recursive', v => ConfigManager.SetRecursive(v))
persist('forceUpload', v => ConfigManager.SetForceUpload(v))
persist('pairLive', async v => {
  await ConfigManager.SetPairLivePhotos(v)
  // Pairing without holding back lone halves would upload half a pair.
  if (v && !tuning.holdLoneHalves) tuning.holdLoneHalves = true
})
persist('holdLoneHalves', v => ConfigManager.SetSkipIncompleteLivePhotos(v))
persist('promoteStills', v => ConfigManager.SetUpdateExistingPhotosToLive(v))
persist('eraseOriginals', v => ConfigManager.SetDeleteFromHost(v))
persist('anyFileType', v => ConfigManager.SetDisableUnsupportedFilesFilter(v))
persist('dateFromName', v => ConfigManager.SetSetDateFromFilename(v))
persist('ignore', v => ConfigManager.SetExcludePattern(v), 450)
persist('proxy', v => ConfigManager.SetProxy(v), 450)
