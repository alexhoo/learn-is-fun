# Cómo crear niveles

Petición típica de Alexis: "añade N lecciones de la etapa X en el mundo Y". Estos documentos bastan para atenderla sin preguntar:

- `STAGES.md`: la escalera de gramática (qué estructura enseña cada etapa y con qué palabras).
- `COMPLEXITY.md`: cómo se sube la dificultad, la plantilla de lección y la lista de comprobación.
- `themes/<mundo>.md`: la plantilla de cada tipo de juego (mundo, tono, vocabulario, logros, ideas de frases).

## Flujo

1. Leer `STAGES.md` (etapa pedida y anteriores), `COMPLEXITY.md` y `themes/<mundo>.md`.
2. Elegir una estructura nueva por lección y redactar las frases con vocabulario ya introducido.
3. Añadir en `src/content/words.json` las palabras de contenido que falten (una por línea, mismo formato) y en `src/content/grammarWords.json` solo las palabras de gramática que usan las frases nuevas y aún no están, con la etapa de la lección.
4. Escribir las lecciones al final de la unidad del mundo en `src/content/course.json`, con `stage`, ids `<unidad>-NN` y ejercicios `<lección>-e1…`. Una unidad nueva necesita un mundo con colores en `src/theme/index.ts` y su archivo en `themes/`.
5. Logros de mundo en `src/content/achievements.json`: un mundo nuevo lleva el suyo (`lessonsCompleted` con el total acumulado de lecciones hasta el final de ese mundo). Añadir lecciones a un mundo que no es el último desplaza a los mundos siguientes: subir en esa cantidad el `gte` de los logros de mundo posteriores y del propio mundo.
6. Actualizar los tests de `src/__tests__/domain.test.ts` que fijan el curso (`lecciones con stage, en orden` y `completar las N lecciones`): su lista y su número cambian con cada lección nueva. Ejecutar `npm test` y `npm run typecheck`. Un error de validación indica contenido mal escrito: corregir el contenido y dejar los validadores como están.
7. Las lecciones insertadas antes de otras ya completadas obligan a quien tenga progreso a jugarlas (el desbloqueo es lineal por orden); preferir añadir al final del curso.
8. Actualizar la sección de la etapa en `STAGES.md` y el tema en `themes/` con lo añadido.

## Formato de datos

La fuente de verdad son los tipos de `src/domain/types.ts` y las reglas de `validateCourse` en `src/content/index.ts`. Una lección:

```json
{
  "id": "animals-03",
  "title": { "en": "It is a…", "es": "Es un…" },
  "stage": "G1",
  "exercises": [
    { "id": "animals-03-e1", "type": "pick-image", "difficulty": 1, "skill": "listening", "answer": "w_horse", "distractors": ["w_cow", "w_pig"] },
    { "id": "animals-03-e3", "type": "fill-blank", "difficulty": 1, "skill": "grammar", "sentence": { "en": "It ___ a cat", "es": "Es un gato" }, "answer": "is", "options": ["is", "are"] },
    { "id": "animals-03-e4", "type": "order-words", "difficulty": 1, "skill": "grammar", "sentence": { "en": "It is a cat", "es": "Es un gato" }, "extraTokens": ["an"] }
  ]
}
```

Los demás tipos: `drag-to-image` (`word`, `targets`), `match` (`pairs`), `scramble` (`word`, `extraLetters`). `skill`: `pick-image` listening, `drag-to-image` y `match` vocab, `scramble` spelling, `order-words` y `fill-blank` grammar.
