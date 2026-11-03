import type { Unit } from '../domain/types';

export const colors = {
  bg: '#FFF9F0',
  card: '#FFFFFF',
  ink: '#2B2D42',
  inkSoft: '#6B6F8A',
  border: '#E8E2D6',
  track: '#EDE7DA',

  primary: '#4D96FF',
  primaryDark: '#2F6FD6',
  success: '#3BC47F',
  successDark: '#27995F',
  successBg: '#DFF7EA',
  danger: '#FF7A59',
  dangerDark: '#D9573A',
  dangerBg: '#FFE6DE',
  accent: '#FFC94D',
  accentDark: '#E0A61B',
  purple: '#8B7BFF',
  purpleDark: '#6656E0',
  locked: '#D5CFC2',
  lockedDark: '#B9B2A2',
} as const;

export const radius = { sm: 12, md: 18, lg: 26, pill: 999 } as const;

export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 36 } as const;

/** Ancho máximo del contenido: en iPad el juego no se estira de borde a borde. */
export const MAX_CONTENT_WIDTH = 760;

export const font = {
  title: { fontSize: 34, fontWeight: '900' as const },
  heading: { fontSize: 26, fontWeight: '800' as const },
  body: { fontSize: 20, fontWeight: '600' as const },
  small: { fontSize: 16, fontWeight: '600' as const },
};

type WorldTheme = { bg: string; path: string; pathDark: string };

export const worlds: Record<Unit['world'], WorldTheme> = {
  farm: { bg: '#EAF7E0', path: '#7BC96F', pathDark: '#4FA847' },
  rainbow: { bg: '#F6ECFF', path: '#B08BFF', pathDark: '#8660E0' },
  space: { bg: '#E3E8FF', path: '#6F7CFF', pathDark: '#4A55D8' },
  city: { bg: '#FFF0DC', path: '#FFB14D', pathDark: '#E08A1B' },
};
