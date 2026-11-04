# Currículo de gramática y plan de estudio con temática de juego

Fecha: 2026-11-04 · Estado: borrador para aprobación

Convención: lo que dijo Alexis aparece como tal. Lo marcado **(mi decisión)** lo he decidido yo y se puede cambiar.

## Intención

English Kids es un juego para aprender inglés (7-11 años, hispanohablantes, iPad). Hoy enseña vocabulario suelto (animales, colores) y tiene un único ejercicio de gramática: ordenar las palabras de una frase.

Alexis quiere que el niño pase de **reconocer palabras a construir y entender frases**, con niveles que suban de complejidad. Quiere poder **pedirme más niveles cuando los necesite y que yo los genere**, con una **base de conocimiento fija** que me permita producir cualquier nivel acorde a su complejidad y nivel de estudio. Más adelante podría generarlos la propia app, pero eso queda fuera de este trabajo. Quiere además un **plan de estudio con temática de juego** donde el niño se sienta animado al avanzar, y que se adapte fácilmente a otras temáticas.

## Qué se entrega

1. **Base de conocimiento del currículo** en `docs/curriculum/` (versionada en el repo). Contiene:
   - La escalera de gramática por etapas, de Pre-A1 a A1 detallada, con A2 solo esbozado.
   - Las reglas para subir la complejidad.
   - La plantilla de lección.
   - La lista de comprobación para crear contenido.
   - El mapa de temáticas del juego.
2. **Lecciones nuevas** (unas 8) con gramática, añadidas al curso. **(mi decisión: 8 lecciones, etapas G1-G3)**
3. **Plan de estudio con temática de juego**, que va dentro de la base de conocimiento: cómo se reparten las etapas por mundos y cómo se anima al niño.
4. **Un flujo de generación bajo demanda.** Alexis pide "añade N lecciones de la etapa X en el mundo Y". Yo leo la base de conocimiento, añado el vocabulario que falte, escribo las lecciones y las valido con tests. Se apoya en una skill de proyecto fina que apunta a los documentos. **(mi decisión)**

## Objetivos

- Añadir un nivel nuevo sin tocar código de pantallas: solo datos más validación automática.
- Que una sesión nueva, sin contexto previo, pueda crear una lección correcta leyendo solo la base de conocimiento.
- Que las etapas de gramática no dependan de la temática. La temática (mundo, mascota, nombres) es una capa que se cambia sin reescribir el currículo.
- Progresión que anime: cada lección introduce **una sola** estructura nueva y recicla la anterior.

## No objetivos

- Que la app genere niveles sola (IA en la app o en la nube).
- Rediseñar pantallas, el mapa o el sistema de recompensas. Se reutilizan XP, estrellas, monedas, pegatinas y logros. Solo se añaden logros nuevos por datos.
- Que la práctica de gramática alimente la maestría y el repaso espaciado. Hoy `order-words` devuelve `wordIds: []`, así que no cuenta. Se deja anotado como carencia conocida.
- Contenido A2 completo. Solo se esboza para que la escalera tenga continuación.
- Cuentas, nube y sincronización.

## Antiobjetivos (aunque "funcione", sería un fallo)

- Explicaciones largas o terminología gramatical para niños de 7 a 11 años. El niño debe notar el patrón con ejemplos y una pista corta en español, no leer reglas.
- Castigar el error. Se mantiene la regla actual de que terminar siempre da al menos 1 estrella.
- Subir tanto la dificultad que el niño se bloquee. Ninguna lección exige perfección para desbloquear la siguiente.
- Lecciones que mezclen varias estructuras nuevas a la vez.
- Frases con vocabulario que el niño aún no ha visto.

## Restricciones

- Todo el contenido es JSON referenciado por id (`words.json`, `course.json`). Los ejercicios no incrustan vocabulario. Se respeta esto.
- `validateCourse` (en `src/content/index.ts`) debe seguir pasando con `npm test`. Se amplía con reglas nuevas.
- Se conservan los 5 tipos de ejercicio y la escala de dificultad `difficulty` 1-5.
- Los mundos disponibles son `farm`, `rainbow`, `space`, `city` (tipo `Unit['world']`, colores en `src/theme`). Añadir un mundo nuevo requiere un cambio pequeño de código en esos dos sitios.
- Textos de ejercicios en inglés con pista en español, como ahora. Comentarios de código en español.
- Sin dependencias nuevas. Debe funcionar sin conexión en iPad y en Android.
- Se sigue el flujo de AGENTS.md: antes de tocar APIs de Expo/React Native se consulta la documentación de la versión instalada (SDK 58).

## Diseño acordado y propuesto

### Escalera de gramática (propuesta **(mi decisión)**, se afina al escribir la base de conocimiento)

| Etapa | Estructura | Ejemplo | Error típico del hispanohablante |
|---|---|---|---|
| G0 (existe) | Palabras sueltas | cat, red | ninguno relevante |
| G1 | `I see a/an + noun`, `It is a + noun` | I see a dog | olvidar el artículo; a/an |
| G2 | `The + noun + is + adjetivo` | The cow is big | orden "gato rojo" → "red cat"; omitir "is" |
| G3 | Plurales y números 1-10 | Two cats | olvidar la -s; "are" con plurales |
| G4 | `I like / I have + noun`, negación sencilla | I like pizza | omitir el sujeto; "do not" |
| G5 | Preguntas y respuestas cortas | Is it a cat? Yes, it is | orden de la pregunta |
| G6 | `I can + verbo`, presente simple con "is/am/are" | I can jump | "I have 8 years" |
| A1+ | there is/are, in/on/under, this/that, presente continuo | There is a cat on the bed | falsos amigos, preposiciones |

Cada etapa tendrá en la base de conocimiento:
- Una frase "el niño puede…".
- Las estructuras objetivo.
- El banco de vocabulario permitido.
- Los errores típicos de un hispanohablante.
- Recetas de ejercicios por dificultad.

### Reglas de complejidad (se concretan en la base de conocimiento)

- **Dificultad 1-5.** Sube con la longitud de la frase, el número de fichas extra o de distractores y el tipo de ejercicio (de reconocer a producir).
- **Una lección dura unos 3 minutos y tiene unos 6 ejercicios.** Van en rampa: reconocer, practicar y producir.
- **Una estructura nueva por lección,** más un ejercicio que recicla lo anterior.
- **Todo el vocabulario de una frase** debe haberse introducido antes (en una lección anterior o en la misma).

### Plan de estudio con temática de juego

- Cada **mundo** es un capítulo del mapa, con su color y mascota. Cada mundo trabaja una etapa o un tema, por ejemplo la granja con G1.
- Cada mundo termina con una **lección jefe**: repaso con dificultad más alta. Es una lección normal, sin código nuevo. **(mi decisión)**
- El ánimo sale de lo que ya existe (estrellas, XP, monedas, pegatinas) más **logros nuevos por datos**, con las reglas existentes (`lessonsCompleted`, `perfectLesson`, `streak`, `wordsMastered`). Por ejemplo, "Explorador de la granja" al completar el mundo.
- La capa de temática vive en `docs/curriculum/themes/` con **un archivo por tipo de juego** (granja, arcoíris, espacio, ciudad…). **Cada archivo sigue la misma plantilla**, con toda la información que necesito para generar niveles de ese juego (aprobado por Alexis el 2026-11-04):
  - Mundo del código (`Unit['world']`), emoji, mascota y tono de los mensajes.
  - Etapas de gramática que trabaja y en qué orden.
  - Banco de vocabulario del tema, con las palabras ya existentes y las previstas.
  - Mezcla de ejercicios típica y estilo de la lección jefe.
  - Logros asociados.
  - Ideas de contexto para las frases, por ejemplo qué situaciones usar en ejemplos.
  Cambiar de temática o crear una nueva es rellenar esa plantilla. El currículo de etapas no se toca. La plantilla se completa para `farm`, `rainbow` y `space` en este trabajo, y `city` queda con la plantilla en blanco como ejemplo.

### Lecciones iniciales **(mi decisión)**

Total: 8 lecciones, añadidas al final de las unidades existentes y en una unidad nueva.

- `farm` (+2, etapa G1): "I see a/an…", "It is a…".
- `rainbow` (+2, etapa G2): "The cat is red", big/small.
- Unidad nueva `space` (+4, etapa G3): números 1-6 y plurales ("two stars"), más una lección jefe al final.
- Lección jefe: es una lección normal con título "Boss: …" y `difficulty` 3 o más. No hay campo ni código nuevo. Los jefes de `farm` y `rainbow` se dejan para después.
- La primera lección de `space` enseña sobre todo vocabulario (números y objetos del espacio). La regla "una estructura nueva por lección" se refiere a gramática, no a vocabulario.
- Si las dependencias de vocabulario lo exigen, se puede mover una etapa a otro mundo. Cualquier cambio de ese tipo se anota en la base de conocimiento.

### Qué cuenta como vocabulario "ya introducido" **(mi decisión)**

El validador usa tres fuentes y nada más:

1. **Palabras de contenido:** las de `words.json`, con su plural regular (`+s` / `+es`). Una palabra cuenta como introducida si aparece como palabra enseñada (`answer` de `pick-image`, `word` de `drag-to-image` o `scramble`, `pairs` de `match`) en una lección anterior en el orden del curso, o en la misma lección. Los distractores no cuentan. No se exige orden entre ejercicios de la misma lección, pero la receta pone las frases al final.
2. **Palabras de gramática:** un archivo nuevo `src/content/grammarWords.json` con las palabras funcionales y básicas que no son sustantivos ilustrables (`I`, `see`, `a`, `an`, `the`, `is`, `are`, `it`, `like`, `have`, `can`, `yes`, `no`, `not`, `big`, `small`…). Cada una tiene la etapa en que se introduce. Una frase de una lección con `stage: "Gn"` solo puede usar palabras de gramática de etapa Gn o anterior.
3. **Números:** se añaden como palabras normales (`w_one`…`w_six`, con emoji `1️⃣`…).

### Lecciones existentes **(mi decisión)**

Las reglas nuevas solo se aplican a lecciones que tengan `stage`. Las lecciones actuales no tienen y quedan exentas, sin reescribirlas. Una "lección de gramática" es la que tiene `stage`. Las frases ya existentes (por ejemplo "The cow is big" en `animals-02` o "I like green" en `colors-02`) se quedan como están. La base de conocimiento anota que son anteriores a la escalera.

### Ejercicio nuevo para gramática **(mi decisión, fácil de quitar)**

`fill-blank`: una frase con un hueco y 2-3 palabras entre las que elegir. Pide cambios de tipos, `evaluate`, validación, un componente y un test. Sin él, la gramática solo se practicaría con `order-words`, que cansa.

Forma de los datos:
- `sentence: { en, es }`, donde `en` lleva el hueco marcado como `___` (por ejemplo `"The cow ___ big"`).
- `answer: string` y `options: string[]`, que son texto y no ids de palabra. La respuesta debe estar entre las opciones.
- `evaluate` compara el texto normalizado.
- No lleva imagen en esta primera versión.
- Como `order-words`, no alimenta la maestría ni el repaso espaciado (`exerciseWordIds` devuelve `[]`).
- Audio: el altavoz no suena antes de responder, para no regalar la respuesta. Al acertar se dice la frase completa con la voz del dispositivo (`expo-speech`), igual que el resto de ejercicios.

### Metadatos de lección **(mi decisión)**

Campo opcional `stage` en `Lesson` (por ejemplo `"G2"`). Sirve para validar y para que yo sepa qué se trabaja.

## Validación nueva

Además de lo que ya comprueba `validateCourse`:
- Las lecciones con `stage` tienen entre 5 y 8 ejercicios.
- Las frases de `order-words` y `fill-blank` en lecciones con `stage` usan solo vocabulario ya introducido, según las tres fuentes de arriba.
- `fill-blank` es válido: la respuesta está entre las opciones y el hueco existe.
- `stage` es válido cuando está presente.

Todo con tests en `src/__tests__/`.

## Criterios de éxito

- `npm test` y `npm run typecheck` pasan.
- Las lecciones nuevas se juegan en orden y se desbloquean una tras otra.
- Un agente nuevo, con solo la base de conocimiento, crea una lección de otra etapa y pasa la validación sin preguntar nada.

## Se deja al constructor

Las listas exactas de vocabulario y de frases, la redacción de la base de conocimiento, los nombres de campos, el diseño visual de `fill-blank`, el reparto concreto de dificultades dentro de cada lección y el contenido de la skill de proyecto.
