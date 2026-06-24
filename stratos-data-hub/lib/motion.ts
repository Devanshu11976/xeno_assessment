/** Shared easing curve for landing-page motion */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const

/** Site-wide duration multiplier — increase to slow animations */
export const MOTION_SCALE = 1.25

const LEGACY_SCALE = 1.65

export function motionDuration(seconds: number): number {
  return seconds * MOTION_SCALE
}

/** Match raw CSS / JS durations tuned before MOTION_SCALE (~25% faster vs legacy) */
export function cssDuration(seconds: number): number {
  return seconds * MOTION_SCALE / LEGACY_SCALE
}

export function cssDurationMs(ms: number): number {
  return Math.round(ms * MOTION_SCALE / LEGACY_SCALE)
}
