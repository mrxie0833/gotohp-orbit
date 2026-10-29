import { describe, expect, it } from 'vitest'
import { Tracker, initialState, type FileEvent, type WorkerState } from './tracker'

const file = (over: Partial<FileEvent>): FileEvent => ({
  MediaKey: '', IsError: false, Skipped: false, ErrorMessage: '', SkipCode: '', SkipReason: '', Path: '', Paths: [], ...over,
})
const worker = (over: Partial<WorkerState>): WorkerState => ({
  WorkerID: 1, Status: 'uploading', FilePath: 'a', FileName: 'a', Message: '', BytesUploaded: 0, BytesTotal: 0, Attempt: 1, ...over,
})

describe('Tracker', () => {
  it('sorts results into sent, held and failed', () => {
    const tr = new Tracker(initialState())
    tr.start(3, 0)
    tr.file(file({ Path: 'a', MediaKey: 'k' }))
    tr.file(file({ Path: 'b', Skipped: true, SkipCode: 'dup', SkipReason: 'already there' }))
    tr.file(file({ Path: 'c', IsError: true, ErrorMessage: 'boom' }))
    expect(tr.state.tally.sent).toHaveLength(1)
    expect(tr.state.tally.held[0].code).toBe('dup')
    expect(tr.state.tally.failed[0]).toEqual({ path: 'c', message: 'boom' })
    expect(tr.state.doneFiles).toBe(3)
  })

  it('finishes by itself when the batch is only held-back files', () => {
    let finished = 0
    const tr = new Tracker(initialState(), Date.now, () => finished++)
    tr.start(2, 0)
    tr.file(file({ Path: 'a', Skipped: true }))
    tr.file(file({ Path: 'b', Skipped: true }))
    expect(tr.state.finished).toBe(true)
    expect(finished).toBe(1)
    tr.stop()
    expect(finished).toBe(1)
  })

  it('computes speed from a rolling window and withholds ETA while warming up', () => {
    let clock = 0
    const tr = new Tracker(initialState(), () => clock)
    tr.start(1, 10_000)
    for (let i = 1; i <= 5; i++) {
      clock = i * 500
      tr.worker(worker({ BytesTotal: 10_000, BytesUploaded: i * 1000 }))
    }
    expect(tr.state.bytesPerSecond).toBeGreaterThan(1500)
    expect(tr.state.etaSeconds).toBeNull()
    clock = 5000
    tr.worker(worker({ BytesTotal: 10_000, BytesUploaded: 5000 }))
    expect(tr.state.etaSeconds).not.toBeNull()
  })

  it('keeps byte totals non-negative when dedupe shrinks the batch', () => {
    const tr = new Tracker(initialState())
    tr.start(1, 100)
    tr.adjustTotalBytes(-500)
    expect(tr.state.totalBytes).toBe(0)
  })

  it('drops quiet warning codes from notes', () => {
    const tr = new Tracker(initialState())
    tr.start(1, 0)
    tr.warn({ Paths: ['x'], Code: 'ambiguous-filename-stem', Message: 'm' })
    tr.warn({ Paths: ['y'], Code: 'other', Message: 'm' })
    expect(tr.state.tally.notes).toHaveLength(1)
  })
})
