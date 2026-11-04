# Cómo crear niveles

Petición típica de Alexis: "añade N lecciones de la etapa X en el mundo Y". Estos documentos bastan para atenderla sin preguntar:

- `STAGES.md`: la escalera de gramática (qué estructura enseña cada etapa y con qué palabras).
- `COMPLEXITY.md`: cómo se sube la dificultad, la plantilla de lección y la lista de comprobación.
- `themes/<mundo>.md`: la plantilla de cada tipo de juego (mundo, tono, vocabulario, logros, ideas de frases).

## Flujo

1. Leer `STAGES.md` (etapa pedida y anteriores), `COMPLEXITY.md` y `themes/<mundo>.md`.
2. Elegir una estructura nueva por lección y redactar las frases con vocabulario ya introducido.
3. Añadir en `src/content/words.json` las palabras de contenido que falten (una por línea, mismo formato) y en `src/content/grammarWords.json` las palabras de gramática de la etapa que falten.
4. Escribir las lecciones al final de la unidad del mundo en `src/content/course.json`, con `stage`, ids `<unidad>-NN` y ejercicios `<lección>-e1…`. Una unidad nueva necesita un mundo con colores en `src/theme/index.ts` y su archivo en `themes/`.
5. Añadir un logro de mundo completado en `src/content/achievements.json` si el mundo es nuevo (`lessonsCompleted` con el total acumulado de lecciones).
6. Ejecutar `npm test` y `npm run typecheck`. Un error de validación indica contenido mal escrito: corregir el contenido y dejar los validadores como están.
7. Actualizar la sección de la etapa en `STAGES.md` y el tema en `themes/` con lo añadido.

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
