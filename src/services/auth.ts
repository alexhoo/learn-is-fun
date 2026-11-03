/**
 * Cuenta del adulto (padre, madre o tutor). Los niños NO tienen cuenta ni email:
 * sus perfiles cuelgan de esta cuenta cuando la sincronización en la nube esté activada.
 *
 * Hoy solo existe la versión local (sin cuenta). Para activar la nube se implementa
 * esta interfaz con Supabase Auth (región UE, enlace mágico por email) y se cambia aquí.
 */
export type ParentAccount = { id: string; email: string };

export interface AuthService {
  /** Cuenta actual, o null si la app funciona solo en local. */
  getAccount(): Promise<ParentAccount | null>;
  /** Envía un enlace mágico al email del adulto. */
  signInWithEmail(email: string): Promise<void>;
  signOut(): Promise<void>;
  /** ¿Está disponible el registro en la nube en esta versión? */
  readonly cloudAvailable: boolean;
}

export const localOnlyAuth: AuthService = {
  cloudAvailable: false,
  getAccount: async () => null,
  signInWithEmail: async () => {
    throw new Error('Cloud sync is not available in this version yet.');
  },
  signOut: async () => {},
};

export const authService: AuthService = localOnlyAuth;
