# Currículo de gramática y plan de estudio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir gramática al curso: ejercicio `fill-blank`, validación de etapas, 8 lecciones nuevas, y una base de conocimiento (`docs/curriculum/`) con la que Claude genera más niveles bajo demanda.

**Architecture:** El contenido sigue siendo datos (JSON) validados por `validateCourse`. Se añade un campo opcional `stage` a `Lesson`; solo las lecciones con `stage` pasan las reglas nuevas, así que las actuales quedan intactas. La base de conocimiento separa la escalera de etapas (independiente del tema) de una plantilla por tema/mundo, y una skill de proyecto apunta a ella.

**Tech Stack:** TypeScript, Expo SDK 58 / React Native 0.88, XState, `node:test` vía `tsx` (`npm test`).

**Spec:** `docs/superpowers/specs/2026-11-04-grammar-curriculum-design.md`

## Global Constraints

- Contenido solo como JSON referenciado por id (`words.json`, `course.json`); los ejercicios no incrustan vocabulario.
- `npm test` y `npm run typecheck` deben pasar al final de cada tarea.
- Se conservan los 5 tipos de ejercicio actuales y la escala `difficulty` 1-5; se añade solo `fill-blank`.
- Sin dependencias nuevas. Comentarios de código en español. Textos de ejercicio en inglés con pista en español.
- Mundos disponibles: `farm`, `rainbow`, `space`, `city` (`Unit['world']`). `space` ya tiene colores en `src/theme/index.ts`.
- No cambiar el comportamiento de lecciones sin `stage`. No reescribir las lecciones existentes.
- Antes de tocar APIs de Expo/React Native se consulta la documentación de la versión instalada (AGENTS.md).
- Al crear la skill y al editar `AGENTS.md`, aplicar la skill `writing-for-agents`.

## Review Focus

- `fill-blank` con respuesta en otra capitalización o con espacios (` IS `) debe contar como correcta (Task 1).
- `fill-blank` con hueco ausente o repetido, opciones duplicadas (sin distinguir mayúsculas) o respuesta fuera de las opciones debe dar error de validación (Task 1).
- Frases con puntuación y mayúsculas ("It is a cat.", "I see Two cats") no deben dar falsos errores de vocabulario (Task 2).
- Una palabra enseñada en una lección **posterior** no puede usarse en una frase anterior (Task 2).
- Las lecciones nuevas se desbloquean en orden y ningún logro de "mundo completado" pide más lecciones de las que existen (Task 6).

---

## Preflight: dejar la rama limpia

- [ ] **Step 1:** Ejecutar `git status --short`. Debe mostrar solo el arreglo de `round` (`src/__tests__/machines.test.ts`, `src/app/lesson/[id].tsx`, `src/machines/exerciseMachine.ts`) y `docs/superpowers/`.
- [ ] **Step 2:** Commit del arreglo: `git add src && git commit -m "fix: no remontar el ejercicio al responder (key por round)"`.
- [ ] **Step 3:** Commit del diseño y del plan: `git add docs && git commit -m "docs: diseño y plan del currículo de gramática"`.

---

### Task 1: Ejercicio `fill-blank`

**Files:**
- Modify: `src/domain/types.ts` (tipo y unión `Exercise`)
- Modify: `src/domain/evaluate.ts`
- Modify: `src/content/index.ts` (`exerciseWordIds`, `validateCourse`)
- Create: `src/exercises/FillBlank.tsx`
- Modify: `src/exercises/registry.tsx`
- Test: `src/__tests__/domain.test.ts`

**Interfaces:**
- Produces: `FillBlankExercise = ExerciseBase & { type: 'fill-blank'; sentence: { en: string; es: string }; answer: string; options: string[] }`. `sentence.en` contiene `___` exactamente una vez. Forma parte de `Exercise`.
- Produces: `evaluate(ex, answer)` para `fill-blank`: `typeof answer === 'string'` y texto normalizado igual a `ex.answer` normalizado.
- Produces: `exerciseWordIds` devuelve `[]` para `fill-blank`.

- [ ] **Step 1: Escribir los tests que fallan** en `domain.test.ts` (bloque `describe('fill-blank')`). Usar `const fb = { id: 'fb1', type: 'fill-blank', difficulty: 1, skill: 'grammar', sentence: { en: 'It ___ a cat', es: 'Es un gato' }, answer: 'is', options: ['is', 'are'] } as const`:
  - `evaluate(fb, 'is') === true`, `evaluate(fb, ' IS ') === true`, `evaluate(fb, 'are') === false`, `evaluate(fb, ['is']) === false`.
  - `exerciseWordIds(fb)` deep-equal `[]`.
  - Con una copia de `course` a la que se añade `fb` modificado, `validateCourse(copia, words)` contiene un error que incluye `'fb1'` en cada caso: `en: 'It is a cat'` (sin hueco), `en: 'It ___ ___ cat'` (dos huecos), `answer: 'am'` (no está en las opciones), `options: ['is']` (menos de 2), `options: ['is', 'IS']` (duplicadas sin distinguir mayúsculas), cinco opciones (máximo 4).
- [ ] **Step 2:** Ejecutar `npm test`. Esperado: fallan los tests nuevos y `tsc` no compila hasta el paso siguiente.
- [ ] **Step 3: Implementar tipos, `evaluate`, `exerciseWordIds` y las reglas de `validateCourse`** (mensajes en español que incluyan `ex.id`). En `evaluate` reutilizar el `norm` existente.
- [ ] **Step 4: Implementar `FillBlank` en `src/exercises/FillBlank.tsx`** con firma `export function FillBlank({ exercise, disabled, onSubmit }: ExerciseProps<FillBlankExercise>)`:
  - `Prompt` con `text="Fill the blank"` y `hint={exercise.sentence.es}`, sin `speak`.
  - La frase en inglés con el hueco visible y, tras pulsar, con la opción elegida dentro.
  - Opciones barajadas con `useMemo(() => shuffle(exercise.options), [exercise])`, como botones grandes con `cardColors('idle'|'correct'|'wrong')` igual que `PickImage`. Pulsar una opción hace `setPicked` y `onSubmit(option)`.
  - Si `evaluate(exercise, option)` es verdadero, `feedback.speak(exercise.sentence.en.replace('___', exercise.answer))`.
  - Registrar `'fill-blank': FillBlank` en `registry.tsx`.
- [ ] **Step 5:** Ejecutar `npm test && npm run typecheck`. Esperado: todo pasa.
- [ ] **Step 6: Commit** `feat: ejercicio fill-blank`.

---

### Task 2: Etapas y reglas de vocabulario para lecciones de gramática

**Files:**
- Create: `src/domain/stages.ts`
- Create: `src/content/grammarWords.json` (contenido: `[]` por ahora)
- Modify: `src/domain/types.ts` (`Lesson.stage?: Stage`, tipo `GrammarWord`)
- Modify: `src/content/index.ts` (exportar `grammarWords`, añadir `validateStageLessons`, llamarla desde `validateCourse`)
- Test: `src/__tests__/domain.test.ts`

**Interfaces:**
- Produces: `STAGES = ['G1','G2','G3','G4','G5','G6','A1'] as const`, `type Stage`, `stageRank(s: Stage): number` en `src/domain/stages.ts`.
- Produces: `type GrammarWord = { text: string; stage: Stage }` (en `types.ts`) y `export const grammarWords: GrammarWord[]` en `content/index.ts`.
- Produces: `validateStageLessons(c: Course, vocabulary: Record<string, Word>, grammar: GrammarWord[]): string[]`. `validateCourse(c?, vocabulary?, achievementList?, grammar = grammarWords)` la incluye en su resultado.
- Reglas, solo para lecciones con `stage`:
  1. `stage` debe estar en `STAGES`.
  2. Entre 5 y 8 ejercicios.
  3. Cada token de `order-words` (`sentence.en`) y de `fill-blank` (`sentence.en` con `___` sustituido por `answer`) se normaliza (minúsculas, sin `. , ! ?`) y debe ser: (a) el `en` de una palabra enseñada, o ese `en` + `s` o + `es`; o (b) un `GrammarWord.text` con `stageRank(w.stage) <= stageRank(lección.stage)`. Un error por token desconocido, con el id del ejercicio y el token.
  4. Palabra enseñada = `exerciseWordIds(ex)` de cualquier ejercicio de una lección anterior en el orden del curso o de la misma lección. Los distractores y `extraTokens` no cuentan ni se validan.

- [ ] **Step 1: Escribir los tests que fallan.** Helper local `lessonWith(stage, exercises)` que devuelve un `Course` con una lección extra al final y `grammar` de prueba `[{text:'i',stage:'G1'},{text:'see',stage:'G1'},{text:'a',stage:'G1'},{text:'the',stage:'G2'}]`. Llamar a `validateStageLessons` directamente:
  - Stage `'G9'` (cast) → un error que incluye el id de la lección.
  - 4 ejercicios y 9 ejercicios → errores; 5 y 8 → sin error de tamaño.
  - `order-words` `"I see a unicorn"` → error que incluye `unicorn`.
  - `"I see a cat."` y `"i SEE a Cat"` con `cat` enseñada antes → sin errores.
  - `"I see cats"` con `cat` enseñada → sin errores (plural regular).
  - `"The cat"` en lección G1 → error que incluye `the`; en lección G2 → sin error.
  - Palabra enseñada en la misma lección (un `pick-image` con `answer: 'w_dog'` y luego `"I see a dog"`) → sin error.
  - Palabra enseñada solo en una lección **posterior** → error.
  - `fill-blank` `"I see ___ cat"` con `answer: 'a'` → sin error; con `answer: 'zzz'` → error que incluye `zzz`.
  - Lección sin `stage` con `"I see a unicorn"` → sin errores.
  - `validateCourse()` sobre el curso real sigue devolviendo `[]`.
- [ ] **Step 2:** `npm test`. Esperado: los tests nuevos fallan.
- [ ] **Step 3: Implementar** `stages.ts`, el tipo `GrammarWord`, `Lesson.stage?`, el JSON vacío, el export `grammarWords` y `validateStageLessons`. Recorrer las lecciones con `allLessons(c)`, acumulando un `Set<string>` de ids enseñados; antes de validar una lección, añadir los de sus propios ejercicios.
- [ ] **Step 4:** `npm test && npm run typecheck`. Esperado: todo pasa.
- [ ] **Step 5: Commit** `feat: etapas de gramática y validación de vocabulario`.

---

### Task 3: Vocabulario y palabras de gramática nuevos

**Files:**
- Modify: `src/content/words.json`
- Modify: `src/content/grammarWords.json`
- Test: `src/__tests__/domain.test.ts`

**Interfaces:**
- Consumes: `GrammarWord` y `STAGES` (Task 2).
- Produces: palabras nuevas de `words.json`, con la forma existente `{ id, en, es, emoji, category, level }`.

Palabras nuevas (`id`, `en`, `es`, `emoji`, `category`, `level`):

| id | en | es | emoji | category | level |
|---|---|---|---|---|---|
| w_apple | apple | manzana | 🍎 | things | 1 |
| w_egg | egg | huevo | 🥚 | things | 1 |
| w_elephant | elephant | elefante | 🐘 | animals | 2 |
| w_ant | ant | hormiga | 🐜 | animals | 2 |
| w_one…w_six | one…six | uno…seis | 1️⃣…6️⃣ | numbers | 1 |
| w_star | star | estrella | ⭐ | space | 1 |
| w_moon | moon | luna | 🌙 | space | 1 |
| w_sun | sun | sol | ☀️ | space | 1 |
| w_rocket | rocket | cohete | 🚀 | space | 2 |
| w_planet | planet | planeta | 🪐 | space | 2 |
| w_alien | alien | alienígena | 👽 | space | 2 |

Palabras de gramática (`text`, `stage`): `i`, `see`, `a`, `an`, `it`, `is` en G1; `the`, `big`, `small` en G2; `they`, `are` en G3.

- [ ] **Step 1: Escribir los tests que fallan:**
  - `Object.keys(words).length` es igual a la longitud de `words.json` (ids únicos) y todos los `emoji` y `es` no están vacíos.
  - `grammarWords`: textos en minúsculas, sin duplicados, `stage` dentro de `STAGES`, y contiene `{ text: 'are', stage: 'G3' }`.
  - `getWord('w_six').es === 'seis'` y `getWord('w_alien').category === 'space'`.
- [ ] **Step 2:** `npm test`. Esperado: fallan.
- [ ] **Step 3:** Añadir las palabras y las palabras de gramática de las tablas.
- [ ] **Step 4:** `npm test && npm run typecheck`. Esperado: pasan.
- [ ] **Step 5: Commit** `feat: vocabulario de gramática, números y espacio`.

---

### Task 4: Base de conocimiento, temas y skill

**Files:**
- Create: `docs/curriculum/README.md`, `docs/curriculum/STAGES.md`, `docs/curriculum/COMPLEXITY.md`
- Create: `docs/curriculum/themes/_template.md`, `farm.md`, `rainbow.md`, `space.md`, `city.md`
- Create: `.claude/skills/author-lessons/SKILL.md`
- Modify: `AGENTS.md` (un puntero), `README.md` (sección "Añadir contenido")
- Test: `src/__tests__/curriculum.test.ts`

**Interfaces:**
- Produces: cada archivo de `themes/` (salvo `_template.md`) empieza con una línea `world: <valor>` donde el valor es un `Unit['world']` y no se repite entre archivos.

Contenido obligatorio (redacción libre, en español):
- `README.md`: cómo pedir niveles ("añade N lecciones de la etapa X en el mundo Y") y el flujo exacto que sigue Claude: leer `STAGES.md`, `COMPLEXITY.md` y el tema; añadir palabras a `words.json` y palabras de gramática a `grammarWords.json` si faltan; escribir las lecciones con `stage` y ids `<unidad>-NN`; ejecutar `npm test` y `npm run typecheck`; no modificar validadores para hacer pasar el contenido.
- `STAGES.md`: una sección por etapa G1…G6 y A1 (A2 esbozada), con la frase "el niño puede…", estructuras objetivo, palabras de gramática que introduce, errores típicos del hispanohablante, y la tabla de la escalera del spec. G1-G3 detalladas con las lecciones de la Task 5 como ejemplos.
- `COMPLEXITY.md`: mapa de `difficulty` 1-5 (longitud de frase, `extraTokens`, distractores, tipo de ejercicio), plantilla de lección (6 ejercicios, al menos 4 tipos distintos, rampa reconocer → practicar → producir, frases al final, un ejercicio que recicla lo anterior, una estructura nueva), reglas de vocabulario (las del Task 2) y la lista de comprobación final. Anotar que las lecciones anteriores a la escalera (`animals-01/02`, `colors-01/02`) están exentas.
- `themes/_template.md`: los campos del spec: `world:`, emoji, mascota y tono, etapas y orden, banco de vocabulario (existente y previsto), mezcla de ejercicios y estilo de la lección jefe, logros asociados e ideas de contexto para frases. `farm`, `rainbow` y `space` rellenos coherentes con la Task 5. `city.md` con la plantilla en blanco y `world: city`.
- `SKILL.md`: nombre `author-lessons`, `description` que diga cuándo usarla (pedir niveles o lecciones nuevas), y pasos que apunten a `docs/curriculum/README.md` sin duplicar su contenido.
- `AGENTS.md`: una línea que mande a `docs/curriculum/README.md` para crear niveles. `README.md`: mencionar `stage` y el puntero.

- [ ] **Step 1: Escribir el test que falla** en `curriculum.test.ts` (usa `node:fs`): lee `docs/curriculum/themes/*.md` excepto `_template.md`; comprueba que hay 4 archivos, que cada primera línea coincide con `/^world: (farm|rainbow|space|city)$/`, que los valores son distintos, y que existen `STAGES.md`, `COMPLEXITY.md` y `README.md`. `npm test` debe fallar.
- [ ] **Step 2:** Escribir los documentos y la skill. Aplicar `writing-for-agents` a `SKILL.md` y `AGENTS.md`.
- [ ] **Step 3:** `npm test`. Esperado: pasa.
- [ ] **Step 4: Commit** `docs: base de conocimiento del currículo y skill author-lessons`.

---

### Task 5: Las 8 lecciones nuevas

**Files:**
- Modify: `src/content/course.json`
- Test: `src/__tests__/domain.test.ts`

**Interfaces:**
- Consumes: `fill-blank`, `stage`, vocabulario y palabras de gramática (Tasks 1-3).
- Produces: lecciones `animals-03`, `animals-04` (al final de la unidad `animals`), `colors-03`, `colors-04` (al final de `colors`) y la unidad nueva `space` (`{ id: 'space', title: { en: 'Space mission', es: 'Misión espacial' }, world: 'space', emoji: '🚀' }`) con `space-01` a `space-04`. Los ids de ejercicio son `<lección>-e1`…`e6`. `skill`: `pick-image` listening, `drag-to-image` y `match` vocab, `scramble` spelling, `order-words` y `fill-blank` grammar.

Notación: `P` pick-image (respuesta; distractores), `D` drag-to-image (palabra; destinos), `M` match (parejas), `S` scramble, `O` order-words (`en` / `es` / `extraTokens`), `F` fill-blank (`en` / `es` / `answer` / `options`). El número final es `difficulty`.

| Lección | Título en / es | stage | e1 | e2 | e3 | e4 | e5 | e6 |
|---|---|---|---|---|---|---|---|---|
| animals-03 | It is a… / Es un… | G1 | P horse; cow, pig · 1 | M dog, cat, pig, cow · 1 | F "It ___ a cat" / "Es un gato" / is / is, are · 1 | O "It is a cat" / "Es un gato" · 1 | S horse · 2 | O "It is a horse" / "Es un caballo" / extra `an` · 2 |
| animals-04 | A or an? / ¿A o an? | G1 | P elephant; cow, pig · 1 | D egg; egg, apple, ant · 1 | M apple, egg, elephant, ant · 2 | F "I see ___ apple" / "Veo una manzana" / an / a, an · 2 | S apple · 2 | O "I see an egg" / "Veo un huevo" / extra `a` · 3 |
| colors-03 | The cat is red / El gato es rojo | G2 | P purple; orange, green · 1 | F "The cat is ___" / "El gato es rojo" / red / red, blue, green · 1 | O "The cat is red" / "El gato es rojo" · 1 | M red, blue, orange, purple · 2 | D yellow; yellow, green, red · 2 | O "The bird is yellow" / "El pájaro es amarillo" / extra `red` · 2 |
| colors-04 | Big and small / Grande y pequeño | G2 | P elephant; ant, cat · 1 | F "The elephant is ___" / "El elefante es grande" / big / big, small · 1 | F "The ant is ___" / "La hormiga es pequeña" / small / big, small · 2 | O "The ant is small" / "La hormiga es pequeña" / extra `big` · 2 | S elephant · 3 | O "The red cow is big" / "La vaca roja es grande" / extra `small` · 3 |
| space-01 | Count to six / Cuenta hasta seis | G3 | P two; one, three · 1 | M one, two, three, four · 1 | D star; star, moon, sun · 1 | S moon · 2 | P six; four, five · 2 | O "I see one star" / "Veo una estrella" / extra `two` · 2 |
| space-02 | Two stars / Dos estrellas | G3 | P rocket; planet, alien · 1 | M rocket, planet, alien, sun · 1 | F "I see two ___" / "Veo dos estrellas" / stars / star, stars · 2 | F "I see one ___" / "Veo una luna" / moon / moon, moons · 2 | O "I see two moons" / "Veo dos lunas" / extra `moon` · 3 | S planet · 3 |
| space-03 | They are… / Son… | G3 | P five; three, six · 1 | F "They ___ stars" / "Son estrellas" / are / is, are · 2 | F "It ___ a rocket" / "Es un cohete" / is / is, are · 2 | O "They are three planets" / "Son tres planetas" / extra `is` · 3 | D alien; alien, rocket, planet · 2 | O "I see four rockets" / "Veo cuatro cohetes" / extra `a` · 3 |
| space-04 | Boss: Space mission / Jefe: Misión espacial | G3 | M star, moon, rocket, alien · 3 | F "It ___ an alien" / "Es un alienígena" / is / is, are · 3 | F "I see ___ rocket" / "Veo un cohete" / a / a, an · 3 | O "The big rocket is red" / "El cohete grande es rojo" / extra `small` · 4 | O "I see five stars" / "Veo cinco estrellas" / extra `star` · 4 | S rocket / extra letters `x` · 4 |

- [ ] **Step 1: Escribir los tests que fallan:**
  - `validateCourse()` deep-equal `[]`.
  - Las lecciones con `stage` son exactamente 8: `['animals-03','animals-04','colors-03','colors-04','space-01','space-02','space-03','space-04']`, con stages `G1,G1,G2,G2,G3,G3,G3,G3`.
  - `findLesson('space-04')?.lesson.title.en` empieza por `'Boss:'`.
  - `course.units.map((u) => u.id)` es `['animals','colors','space']`.
  - Cada lección nueva tiene 6 ejercicios con al menos 4 tipos distintos y `difficulty` no decreciente en `space-04` (3,3,3,4,4,4).
- [ ] **Step 2:** `npm test`. Esperado: fallan (lecciones inexistentes).
- [ ] **Step 3:** Añadir las lecciones y la unidad a `course.json` siguiendo la tabla. Las frases se escriben tal cual.
- [ ] **Step 4:** `npm test && npm run typecheck`. Esperado: pasa, incluido el test existente de "desbloqueo lineal".
- [ ] **Step 5: Commit** `feat: 8 lecciones de gramática y unidad espacial`.

---

### Task 6: Logros por mundo

**Files:**
- Modify: `src/content/achievements.json`
- Test: `src/__tests__/domain.test.ts`

**Interfaces:**
- Produces: logros `farm-explorer` (🌾, "Farm explorer" / "Explorador de la granja", `lessonsCompleted` ≥ 4), `rainbow-explorer` (🌈, "Rainbow explorer" / "Explorador del arcoíris", ≥ 8) y `space-explorer` (🚀, "Space explorer" / "Explorador del espacio", ≥ 12).

- [ ] **Step 1: Escribir los tests que fallan:**
  - Todos los logros con regla `lessonsCompleted` cumplen `gte <= allLessons().length`.
  - Existen los tres ids nuevos y `validateCourse()` sigue siendo `[]` (ids únicos).
  - Con un `Progress` que completa en orden las 12 primeras lecciones (usando `reduceProgress` y eventos como en los tests existentes), `progress.badges` incluye `space-explorer`.
- [ ] **Step 2:** `npm test`. Esperado: fallan.
- [ ] **Step 3:** Añadir los tres logros.
- [ ] **Step 4:** `npm test && npm run typecheck`. Esperado: pasa.
- [ ] **Step 5: Commit** `feat: logros de mundo completado`.

---

### Task 7: Comprobación con un agente nuevo

**Files:** ninguno se conserva.

- [ ] **Step 1:** Lanzar un subagente nuevo, sin darle contexto de esta conversación, con la petición: "Añade 2 lecciones de la etapa G4 en el mundo `farm`", indicándole solo que lea `AGENTS.md`. Debe llegar por sí mismo a `docs/curriculum/README.md`.
- [ ] **Step 2:** Esperar a que termine y ejecutar `npm test && npm run typecheck`. Esperado: pasa sin que el agente haya tocado validadores ni pedido aclaraciones.
- [ ] **Step 3:** Anotar en `docs/curriculum/README.md` cualquier hueco que el agente hubiera tenido que adivinar, y corregirlo. Descartar las lecciones de prueba con `git checkout src/content docs` solo si el agente no encontró huecos; si los hubo, conservar sus correcciones de documentación y descartar solo el contenido de prueba.
- [ ] **Step 4: Commit** `docs: afinar la base de conocimiento tras la prueba` (si hubo cambios).
