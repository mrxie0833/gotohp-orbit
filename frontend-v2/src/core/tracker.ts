/**
 * Pure transfer bookkeeping. It knows nothing about Wails or Vue so it can be tested alone;
 * `transfer-store.ts` feeds it backend events.
 */

export interface WorkerState {
  WorkerID: number
  Status: string
  FilePath: string
  FileName: string
  Message: string
  BytesUploaded: number
  BytesTotal: number
  Attempt: number
}

export interface FileEvent {
  MediaKey: string
  IsError: boolean
  Skipped: boolean
  ErrorMessage: string
  SkipCode: string
  SkipReason: string
  Path: string
  Paths: string[]
}

export interface WarningEvent {
  Paths: string[]
  Code: string
  Message: string
}

export interface SentEntry { path: string; mediaKey: string }
export interface HeldEntry { paths: string[]; code: string; reason: string }
export interface FailedEntry { path: string; message: string }

export interface Tally {
  sent: SentEntry[]
  held: HeldEntry[]
  failed: FailedEntry[]
  notes: HeldEntry[]
}

export interface TransferState {
  active: boolean
  finished: boolean
  totalFiles: number
  doneFiles: number
  totalBytes: number
  doneBytes: number
  bytesPerSecond: number
  etaSeconds: number | null
  startedAt: number
  workers: WorkerState[]
  tally: Tally
}

const WINDOW_MS = 8000
const SAMPLE_MS = 400
const QUIET_CODES = new Set(['incomplete-live-photo-skipped', 'ambiguous-filename-stem'])

export function emptyTally(): Tally {
  return { sent: [], held: [], failed: [], notes: [] }
}

export function initialState(): TransferState {
  return {
    active: false,
    finished: false,
    totalFiles: 0,
    doneFiles: 0,
    totalBytes: 0,
    doneBytes: 0,
    bytesPerSecond: 0,
    etaSeconds: null,
    startedAt: 0,
    workers: [],
    tally: emptyTally(),
  }
}

export class Tracker {
  private completedBytes = 0
  private fileBytes = new Map<string, number>()
  private byteAdjust = 0
  private samples: { t: number; bytes: number }[] = []
  private lastSample = 0
  private workers = new Map<number, WorkerState>()

  constructor(
    public state: TransferState,
    private now: () => number = Date.now,
    private onFinish: () => void = () => {},
  ) {}

  start(total: number, totalBytes: number) {
    Object.assign(this.state, initialState())
    this.state.active = true
    this.state.totalFiles = total
    this.state.totalBytes = totalBytes
    this.state.startedAt = this.now()
    this.completedBytes = 0
    this.byteAdjust = 0
    this.fileBytes.clear()
    this.workers.clear()
    this.samples = []
    this.lastSample = 0
  }

  setTotalBytes(bytes: number) {
    this.state.totalBytes = Math.max(0, bytes + this.byteAdjust)
  }

  adjustTotalBytes(delta: number) {
    this.byteAdjust += delta
    this.state.totalBytes = Math.max(0, this.state.totalBytes + delta)
  }

  warn(w: WarningEvent) {
    if (QUIET_CODES.has(w.Code)) return
    this.state.tally.notes.push({ paths: w.Paths, code: w.Code, reason: w.Message })
  }

  worker(w: WorkerState) {
    if (w.Status === 'uploading' && w.FilePath && w.BytesTotal > 0) {
      this.fileBytes.set(w.FilePath, w.BytesTotal)
    }
    this.workers.set(w.WorkerID, w)
    this.state.workers = [...this.workers.values()].sort((a, b) => a.WorkerID - b.WorkerID)
    this.refresh()
  }

  file(e: FileEvent) {
    const t = this.state.tally
    if (e.IsError) {
      t.failed.push({ path: e.Path, message: e.ErrorMessage })
    } else if (e.Skipped) {
      const paths = (e.Paths?.length ? e.Paths : [e.Path]).filter(Boolean)
      t.held.push({ paths, code: e.SkipCode || 'skipped', reason: e.SkipReason || 'Held back by upload policy' })
    } else {
      t.sent.push({ path: e.Path, mediaKey: e.MediaKey })
      const size = this.fileBytes.get(e.Path)
      if (size) this.completedBytes += size
    }
    this.state.doneFiles += 1
    for (const p of e.Paths?.length ? e.Paths : [e.Path]) this.fileBytes.delete(p)
    this.refresh()

    // A batch made only of held-back files can start and end inside one event burst.
    if (
      this.state.totalFiles > 0 &&
      this.state.doneFiles >= this.state.totalFiles &&
      t.sent.length === 0 &&
      t.failed.length === 0
    ) {
      this.finish()
    }
  }

  stop() {
    this.finish()
  }

  finish() {
    if (!this.state.active) return
    this.state.active = false
    this.state.finished = true
    this.state.etaSeconds = null
    this.state.bytesPerSecond = 0
    this.workers.clear()
    this.state.workers = []
    this.onFinish()
  }

  clear() {
    Object.assign(this.state, initialState())
    this.workers.clear()
    this.fileBytes.clear()
    this.samples = []
  }

  private refresh() {
    let live = 0
    for (const w of this.workers.values()) {
      if (w.Status === 'uploading' && w.BytesTotal > 0) live += w.BytesUploaded
      else if (w.Status === 'finalizing' && w.FilePath) live += this.fileBytes.get(w.FilePath) ?? 0
    }
    const bytes = this.completedBytes + live
    this.state.doneBytes = bytes

    const t = this.now()
    if (t - this.lastSample >= SAMPLE_MS) {
      this.lastSample = t
      this.samples.push({ t, bytes })
      const cutoff = t - WINDOW_MS
      while (this.samples.length > 2 && this.samples[0].t < cutoff) this.samples.shift()
    }
    if (this.samples.length >= 2) {
      const first = this.samples[0]
      const span = t - first.t
      if (span >= 800) {
        this.state.bytesPerSecond = Math.max(0, ((bytes - first.bytes) / span) * 1000)
      }
    }
    this.state.etaSeconds = this.estimate()
  }

  private estimate(): number | null {
    const s = this.state
    if (!s.active || s.totalBytes <= 0 || s.bytesPerSecond <= 0) return null
    if (this.now() - s.startedAt < 3500) return null
    const remaining = Math.max(0, s.totalBytes - s.doneBytes)
    return Math.round(remaining / s.bytesPerSecond)
  }
}
