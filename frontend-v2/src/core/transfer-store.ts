import { reactive } from 'vue'
import { Events } from '@wailsio/runtime'
import { Tracker, initialState, type FileEvent, type WarningEvent, type WorkerState } from './tracker'

export interface AlbumProgress {
  AlbumName: string
  ItemsAdded: number
  TotalItems: number
  AlbumKeys: string[]
  IsComplete: boolean
}

type Listener = () => void

export const transfer = reactive(initialState())
export const albumProgress = reactive<{ current: AlbumProgress | null; busy: boolean }>({ current: null, busy: false })

const finishListeners = new Set<Listener>()
const albumErrorListeners = new Set<(name: string, message: string) => void>()

export const onTransferFinish = (fn: Listener) => {
  finishListeners.add(fn)
  return () => finishListeners.delete(fn)
}
export const onAlbumError = (fn: (name: string, message: string) => void) => {
  albumErrorListeners.add(fn)
  return () => albumErrorListeners.delete(fn)
}

const tracker = new Tracker(transfer, Date.now, () => finishListeners.forEach(fn => fn()))

let wired = false
export function wireTransferEvents() {
  if (wired) return
  wired = true
  Events.On('uploadStart', (e: { data: { Total: number; TotalBytes: number } }) => {
    albumProgress.current = null
    albumProgress.busy = false
    tracker.start(e.data.Total, e.data.TotalBytes)
  })
  Events.On('uploadTotalBytes', (e: { data: number }) => tracker.setTotalBytes(e.data))
  Events.On('uploadTotalBytesDelta', (e: { data: number }) => tracker.adjustTotalBytes(e.data))
  Events.On('uploadWarning', (e: { data: WarningEvent }) => tracker.warn(e.data))
  Events.On('ThreadStatus', (e: { data: WorkerState }) => tracker.worker(e.data))
  Events.On('FileStatus', (e: { data: FileEvent }) => tracker.file(e.data))
  Events.On('uploadStop', () => tracker.stop())
  Events.On('albumProgress', (e: { data: AlbumProgress }) => {
    albumProgress.current = e.data
    albumProgress.busy = true
  })
  Events.On('albumComplete', (e: { data: AlbumProgress }) => {
    albumProgress.current = e.data
    albumProgress.busy = false
  })
  Events.On('albumError', (e: { data: { AlbumName: string; Error: string } }) => {
    albumProgress.busy = false
    albumErrorListeners.forEach(fn => fn(e.data.AlbumName, e.data.Error))
  })
}

export function cancelTransfer() {
  Events.Emit('uploadCancel')
}

export function clearTally() {
  tracker.clear()
  albumProgress.current = null
}
