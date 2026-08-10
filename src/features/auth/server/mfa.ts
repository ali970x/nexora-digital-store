export type AssuranceLevel = string | null;

export function requiresMfaChallenge(
  assurance: {currentLevel: AssuranceLevel; nextLevel: AssuranceLevel} | null | undefined
): boolean {
  return assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2';
}
