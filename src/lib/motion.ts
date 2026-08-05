export const motionTokens = {
  duration: {fast: 0.15, base: 0.24, slow: 0.35},
  easeOut: [0.16, 1, 0.3, 1] as const,
  spring: {type: 'spring' as const, stiffness: 220, damping: 24, mass: 0.72},
  gentleSpring: {type: 'spring' as const, stiffness: 140, damping: 22, mass: 0.9}
} as const;
