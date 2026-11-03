/**
 * Perfil de niño. Solo apodo y avatar: nunca nombre real, fecha de nacimiento ni foto.
 * Cuando exista cuenta en la nube, los perfiles cuelgan de la cuenta del adulto.
 */
export type Profile = {
  id: string;
  nickname: string;
  avatar: string;
  createdAt: string;
};

export const AVATARS = ['🦁', '🐼', '🐸', '🐙', '🦄', '🐯', '🐵', '🐧', '🦖', '🐢', '🐬', '🦋'] as const;

export const MAX_PROFILES = 6;
export const MAX_NICKNAME_LENGTH = 14;

export type NicknameCheck = { ok: true; value: string } | { ok: false; reason: 'empty' | 'too-long' | 'looks-personal' };

/**
 * Valida y normaliza el apodo. Rechaza lo que parezca un dato personal
 * (emails, teléfonos, números largos) porque la app no debe almacenarlos.
 */
export function checkNickname(raw: string): NicknameCheck {
  const value = raw.trim().replace(/\s+/g, ' ');
  if (value.length === 0) return { ok: false, reason: 'empty' };
  if (value.length > MAX_NICKNAME_LENGTH) return { ok: false, reason: 'too-long' };
  if (/@|https?:|www\./i.test(value) || /\d{4,}/.test(value)) return { ok: false, reason: 'looks-personal' };
  return { ok: true, value };
}

export type GateQuestion = { text: string; answer: number };

/** Pregunta de la puerta parental: una multiplicación que un niño de 7-11 años no resuelve de cabeza. */
export function makeGateQuestion(random: () => number = Math.random): GateQuestion {
  const a = 13 + Math.floor(random() * 7); // 13..19
  const b = 6 + Math.floor(random() * 4); // 6..9
  return { text: `${a} × ${b}`, answer: a * b };
}
