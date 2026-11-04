# Complejidad, plantilla de lección y comprobación

## Dificultad (`difficulty` 1-5)

| Nivel | Frase | Ayudas y trampas | Tipo de tarea |
|---|---|---|---|
| 1 | 3-4 palabras | sin `extraTokens`; 2 opciones | reconocer (`pick-image`, `match`, `drag-to-image`) |
| 2 | 4 palabras | 1 `extraTokens` o 3 opciones | reconocer y completar (`fill-blank`) |
| 3 | 4-5 palabras | 1-2 `extraTokens`; opciones que contrastan con la estructura ya vista | producir frases cortas (`order-words`, `scramble`) |
| 4 | 5-6 palabras | `extraTokens` que son errores típicos (`a`/`an`, `is`/`are`) | producir frases mezclando etapas |
| 5 | 6+ palabras | varios `extraTokens` | producir con estructura nueva y repaso |

## Plantilla de lección

- 6 ejercicios, unos 3 minutos. Al menos 4 tipos distintos (lo comprueba `npm test`).
- Rampa: reconocer → practicar → producir. Las frases van al final.
- Una estructura de gramática nueva por lección. La primera lección de un mundo puede centrarse en vocabulario.
- Un ejercicio recicla la estructura de la lección anterior.
- Las lecciones jefe se titulan `Boss: …`, cierran el mundo y usan `difficulty` 3 o más. Cada mundo termina con una.
- El niño siempre gana al menos 1 estrella: sin penalizaciones ni bloqueos por fallar.
- Pista en español corta en cada frase. Sin terminología gramatical.

## Vocabulario permitido (lo valida `npm test`)

Solo las lecciones con `stage` pasan estas reglas; las anteriores a la escalera (`animals-01/02`, `colors-01/02`) están exentas.

- Palabra de contenido: la enseña un ejercicio (`answer` de `pick-image`, `word` de `drag-to-image` o `scramble`, `pairs` de `match`) en una lección anterior **del curso** (el orden es el de `course.json`, unidades incluidas) o en la misma, así que un mundo no puede usar vocabulario de un mundo posterior. Se aceptan sus plurales regulares (`+s`, `+es`). Los distractores y `extraTokens` no la enseñan.
- Palabra de gramática: está en `grammarWords.json` con una etapa igual o anterior a la de la lección.
- En `fill-blank` se valida la frase con el hueco sustituido por `answer`.
- Cada lección con `stage` tiene entre 5 y 8 ejercicios.

## Lista de comprobación

- [ ] Una estructura nueva, frases sin palabras sin introducir.
- [ ] Ids de ejercicio únicos y de la forma `<lección>-eN`.
- [ ] `title` en inglés y español; `difficulty` no decreciente en lecciones jefe.
- [ ] `npm test` y `npm run typecheck` en verde.
