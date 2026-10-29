import { describe, expect, it } from 'vitest'
import { bytes, duration, plural } from './format'

describe('format', () => {
  it('formats bytes', () => {
    expect(bytes(0)).toBe('0 B')
    expect(bytes(1536)).toBe('1.5 KB')
    expect(bytes(5 * 1024 ** 3)).toBe('5.0 GB')
  })
  it('formats durations', () => {
    expect(duration(null)).toBe('–')
    expect(duration(42)).toBe('42s')
    expect(duration(125)).toBe('2m 05s')
  })
  it('pluralizes', () => {
    expect(plural(1, 'file')).toBe('1 file')
    expect(plural(3, 'file')).toBe('3 files')
  })
})
