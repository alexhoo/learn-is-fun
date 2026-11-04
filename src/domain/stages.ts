/** Escalera de gramática, de menor a mayor complejidad. Ver docs/curriculum/STAGES.md. */
export const STAGES = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'A1'] as const;

export type Stage = (typeof STAGES)[number];

/** Posición en la escalera (0 = G1); sirve para comparar etapas. */
export function stageRank(stage: Stage): number {
  return STAGES.indexOf(stage);
}
