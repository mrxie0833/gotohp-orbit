/**
 * Critically damped spring on a single number.
 *
 * `step` advances by `dt` seconds and keeps velocity between calls, so retargeting
 * mid-flight never jumps: motion always continues from the live value.
 * `response` is roughly the time to reach the target (seconds), not a fixed duration.
 */
export interface Spring {
  value: number
  velocity: number
  target: number
  response: number
}

export function createSpring(initial = 0, response = 0.35): Spring {
  return { value: initial, velocity: 0, target: initial, response }
}

export function stepSpring(s: Spring, dt: number): boolean {
  // Angular frequency from response; damping ratio 1 (no overshoot).
  const omega = (2 * Math.PI) / Math.max(0.05, s.response)
  const x = s.value - s.target
  const exp = Math.exp(-omega * dt)
  const nextX = (x + (s.velocity + omega * x) * dt) * exp
  const nextV = (s.velocity - (s.velocity + omega * x) * omega * dt) * exp
  s.value = s.target + nextX
  s.velocity = nextV
  const settled = Math.abs(nextX) < 0.0005 && Math.abs(nextV) < 0.0005
  if (settled) {
    s.value = s.target
    s.velocity = 0
  }
  return settled
}
