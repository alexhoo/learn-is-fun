# English Kids

Juego para aprender inglés (7-11 años) para iPad. Expo + React Native + TypeScript.

## Arrancar

```bash
npm install
npx expo start        # abre en Expo Go o en el simulador de iPad (pulsa "i")
npm test              # pruebas del dominio, repositorio y máquinas
npm run typecheck
```

## Arquitectura

```
src/
  domain/      tipos, evaluación de respuestas y reglas de progreso (puro, sin React)
  content/     palabras, lecciones y logros en JSON  ← aquí se añade contenido
  machines/    XState: lessonMachine (sesión) y exerciseMachine (ciclo de un ejercicio)
  data/        ProgressRepository y ProfileRepository (interfaces) + implementación local
  store/       Zustand: progreso en memoria; la persistencia se inyecta
  services/    voz y vibración; AuthService (cuenta del adulto, hoy solo local)
  exercises/   un componente por tipo de ejercicio + registro
  components/  piezas visuales (botón, mascota, barra, estrellas, confeti…)
  app/         pantallas (Expo Router): selector de perfiles, alta, mapa y lección
```

## Perfiles y cuentas

- Cada niño es un **perfil local** (solo apodo y avatar, nunca nombre real ni fecha de nacimiento).
  El progreso, los eventos y la maestría de palabras están separados por perfil.
- Crear, borrar o gestionar perfiles (cuando ya hay alguno) pide la **puerta parental** (una multiplicación).
- Las rutas están protegidas: sin perfil activo solo se ve el selector (`Stack.Protected` en `_layout.tsx`).
- **Cuenta del adulto en la nube**: pendiente. `services/auth.ts` define `AuthService`;
  implementarlo con Supabase Auth (región UE, enlace mágico) y pedir consentimiento parental
  antes de activar la sincronización. Los perfiles locales se vincularían a la cuenta y subirían sus eventos.

## Añadir contenido

- **Palabras**: `src/content/words.json`.
- **Lecciones**: `src/content/course.json`. Los ejercicios referencian palabras por id.
  `npm test` valida que no haya referencias rotas.
- **Subir dificultad**: más distractores, `extraTokens` / `extraLetters`, frases más largas, `difficulty` 1-5.

## Añadir un tipo de ejercicio

1. Tipo en `domain/types.ts` y regla en `domain/evaluate.ts`.
2. Componente en `exercises/` y alta en `exercises/registry.tsx`.

## Pasar a la nube

Implementar `ProgressRepository` (p. ej. Supabase, región UE) y cambiarlo en `src/store/index.ts`.
El progreso se guarda como registro de eventos con UUID, listo para sincronizar
(`getPendingEvents` / `markSynced`). Para menores de 14 años, pedir consentimiento parental.
