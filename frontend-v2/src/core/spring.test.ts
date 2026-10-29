import { describe, expect, it } from 'vitest'
import { createSpring, stepSpring } from './spring'

describe('spring', () => {
  it('settles on the target without overshoot', () => {
    const s = createSpring(0, 0.3)
    s.target = 1
    let max = 0
    for (let i = 0; i < 600; i++) {
      stepSpring(s, 1 / 60)
      max = Math.max(max, s.value)
    }
    expect(s.value).toBe(1)
    expect(max).toBeLessThanOrEqual(1.0001)
  })

  it('retargets from the live value and keeps velocity', () => {
    const s = createSpring(0, 0.4)
    s.target = 1
    for (let i = 0; i < 10; i++) stepSpring(s, 1 / 60)
    const midValue = s.value
    const midVelocity = s.velocity
    s.target = 0
    stepSpring(s, 1 / 600)
    expect(Math.abs(s.value - midValue)).toBeLessThan(0.01)
    expect(Math.sign(s.velocity)).toBe(Math.sign(midVelocity))
  })
})
