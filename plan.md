# Plan: paisaje cinematográfico de Marte con Vite y Three.js

Este archivo tiene dos partes:
- **Parte 1:** el plan tal como se aprobó antes de ejecutar.
- **Parte 2:** lo que se hizo, cómo se hizo, para qué sirve cada componente y dónde encontrarlo.

> **Nota:** este archivo se creó después de la ejecución. El plan se había guardado fuera del repositorio y aquí se copia sin cambios de contenido.

---

# Parte 1: plan original aprobado

## Contexto
El repo solo tiene `CLAUDE.md` y un commit. Se quiere ver en vivo un paisaje de Marte "de película": dunas, rocas, cielo caramelo con polvo, sol de tarde con luz cálida y sombras suaves, y Fobos y Deimos. Debe verse algo en menos de 2 minutos tras aprobar y mejorar después. `npm run check` será la revisión automática.

Entorno comprobado: Node 26.8.1, npm 11.19, Chrome 156 instalado, puerto 5173 libre. Versiones: three 0.187.0, vite 8.3.5, playwright-core 1.64.1.

## Decisiones
- **Andamiaje a mano**, no `create-vite`: la carpeta ya tiene contenido y así evito prompts y tiempo.
- **JavaScript con módulos ES**, sin TypeScript, para llegar rápido a la primera imagen (KISS).
- **`playwright-core` con `channel: 'chrome'`**: no descarga navegadores y usa tu Chrome con un perfil temporal, sin tocar tus datos.
- **Servidor solo en `localhost:5173`** con `strictPort`, y se abre solo en tu navegador la primera vez. Queda encendido al terminar.
- **Sin assets externos**: todo es procedural y con semilla fija, así no hay licencias ni descargas.

## Desviaciones que conviene conocer
`CLAUDE.md` pide terreno con datos reales y exactitud científica; este pedido prioriza lo visual. Por eso:
- El terreno será **procedural e ilustrativo**, no Jezero real. Los datos reales quedan para después.
- **Sol y lunas irán agrandados** para que se lean en cámara; a escala real Deimos sería casi un punto.
- El atardecer marciano real es **azulado junto al sol**. Aquí será cálido, como pediste.
- Una **leyenda discreta en pantalla** y un ADR breve dejarán constancia de lo anterior, como exige `CLAUDE.md`.

## Etapas

### 1. Primera imagen (meta: menos de 2 min)
1. Crear `package.json`, `vite.config.js`, `index.html`, `.gitignore` y `src/main.js`.
2. Escena mínima: terreno con ruido, cielo en degradado, luz cálida con sombras, sol y dos lunas.
3. `npm install` y `npm run dev -- --open` en segundo plano. Te paso la URL en cuanto responda.

### 2. `npm run check`
`scripts/check.mjs`:
- Reutiliza el servidor si ya responde en 5173; si no, levanta uno y lo apaga al terminar.
- Abre Chrome headless a 1600×900 con WebGL activado y espera la señal `window.__marsReady`, que se pone tras renderizar varios cuadros.
- Guarda la captura en `.check/screenshot.png` (ignorada por git).
- Lista errores de consola, excepciones de página y peticiones fallidas, y las advertencias aparte.
- Sale con código 1 si hay errores o si se agota el tiempo de espera.

### 3. Mejoras grandes (se ven en vivo por HMR)
- **Terreno y rocas:** dunas con crestas y ondulitas, arena oscura en los valles, borde lejano de cráter en silueta, rocas instanciadas con forma irregular y muchas más pequeñas que grandes.
- **Atmósfera y cielo:** domo con shader caramelo, bruma en el horizonte, velos de polvo animados, resplandor del sol, polvo flotante cerca de la cámara y niebla que da profundidad.
- **Lunas:** Fobos irregular y Deimos más pequeña, con cráteres y fase iluminada según la dirección del sol.
- **Acabado de película:** sol bajo a contraluz con sombras largas y suaves, tone mapping ACES, bloom sutil, viñeta, grano y un paneo lento que mantiene sol y lunas siempre en cuadro. `OrbitControls` para mover la vista; el paneo se desactiva con `prefers-reduced-motion`.

### 4. Rondas de revisión (máximo 3)
Una ronda es correr `npm run check`, leer el informe, mirar la captura y corregir. Cuento 3 en total, incluidas las que siguen a cada mejora grande. Si tras la tercera falta algo, paro y digo exactamente qué falta.

## Estructura
```
index.html, vite.config.js, package.json, .gitignore
scripts/check.mjs
src/main.js                    composición y bucle de render
src/domain/terrain-height.js   altura y ruido puros, sin Three.js
src/scene/                     terrain, rocks, sky, moons, lighting, dust, post
test/terrain-height.test.js    determinismo y rangos, con node --test (npm test)
docs/adr/0001-stack-y-escena-ilustrativa.md
```
La altura del terreno queda fuera de Three.js para respetar la separación dominio/presentación de `CLAUDE.md` y poder probarla. No agrego más capas por ahora (YAGNI).

## Verificación: criterio de "listo"
1. `npm run check` termina con 0 errores de consola, 0 excepciones y 0 peticiones fallidas.
2. En la captura, revisada por mí, se ven: dunas, rocas, cielo caramelo con polvo, sol de tarde, luz cálida, sombras suaves y **las dos lunas distinguibles**.
3. `npm test` pasa y el servidor sigue encendido en `http://localhost:5173`.

No haré commits a menos que me lo pidas; los cambios quedan en el árbol de trabajo.

---

# Parte 2: lo que se hizo

## Estado actual
- La escena corre en `http://localhost:5173` mientras el servidor esté encendido. Para volver a prenderlo: `npm run dev`.
- La última ronda de `npm run check` dio 0 errores de consola, 0 excepciones, 0 peticiones fallidas y 0 advertencias.
- `npm test` pasa las 5 pruebas.
- **Nada está confirmado en git**: todos los archivos siguen sin commit.

## Cómo se desarrolló

| Paso | Qué se hizo | Resultado |
|---|---|---|
| 1. Primera imagen | Andamiaje a mano, escena mínima en `src/main.js`, instalación y servidor | Servidor respondiendo; esa primera versión no pasó por `npm run check` |
| 2. Revisión automática | `scripts/check.mjs` y pruebas de altura del terreno | Pruebas en verde; el check se estrenó en la ronda 1 |
| 3. Mejora grande | `src/main.js` se dividió en módulos de `src/scene/`, con terreno, rocas, cielo, lunas, polvo y postproceso | Escena completa |
| 4. Comprobación de la vista | Script temporal que muestreó el terreno, para descartar que una duna tapara la vista | Horizonte a unos 5° y sol por encima |
| Ronda 1 | Check y revisión de la captura | 0 errores. Cielo pálido, sol sin disco, lunas sobreexpuestas y casi sin sombras de rocas |
| Ronda 2 | Se corrigió lo anterior: colores, resplandor, `normalBias` de las sombras y forma de las rocas | 0 errores. Cielo, sol y lunas bien; rocas aplastadas y con destellos, líneas claras en el borde lejano |
| Ronda 3 | Rocas más altas, relieve fino más suave y relieve aplanado a lo lejos | 0 errores y todo lo pedido visible en la captura |

### Diferencias respecto al plan
- **Archivos nuevos:** `src/scene/look.js` y `src/scene/glsl-noise.js` no estaban en la estructura. Evitan repetir valores artísticos y código de ruido entre módulos.
- **Terreno:** se agregó `duneHeightAt_m` al dominio para oscurecer la arena de los valles.
- **Fases de las lunas:** dependen del sol, pero con la luz desplazada hacia la cámara; a contraluz real serían crecientes casi invisibles.
- **Tiempo de la primera imagen:** no se cronometró, así que la meta de 2 minutos no está comprobada. La instalación tardó unos 14 segundos.
- **Orden de trabajo:** este `plan.md` debió existir antes de ejecutar. Se creó al final, a petición del ingeniero.

## Componentes y dónde encontrarlos

### Raíz y herramientas
| Archivo | Para qué sirve |
|---|---|
| `index.html` | Página de entrada, estilos mínimos y leyenda que avisa que la escena es ilustrativa |
| `package.json` | Dependencias con versión exacta y comandos del proyecto |
| `vite.config.js` | Servidor solo en `localhost:5173`, sin cambiar de puerto si está ocupado |
| `.gitignore` | Excluye `node_modules/`, `dist/`, `.check/`, `.env*` y `.DS_Store` |
| `scripts/check.mjs` | Revisión con Chrome invisible: captura, errores de consola y peticiones fallidas |
| `plan.md` | Este documento |
| `CLAUDE.md` | Objetivo del proyecto y reglas de trabajo |

### Dominio (sin dependencias gráficas)
| Archivo | Para qué sirve |
|---|---|
| `src/domain/terrain-height.js` | Calcula con semilla la altura del terreno, las dunas, el borde lejano y la pedregosidad, en metros |

### Presentación
| Archivo | Para qué sirve | Qué tocar aquí |
|---|---|---|
| `src/main.js` | Une todo: renderer, cámara, controles, paneo y bucle de render | Posición de la cámara, velocidad del paneo |
| `src/scene/look.js` | Valores compartidos y función para ubicar direcciones en el cielo | Posición del sol, color del horizonte y de la luz |
| `src/scene/glsl-noise.js` | Funciones de ruido reutilizadas por los shaders | Ruido base |
| `src/scene/terrain.js` | Malla del suelo, color de la arena, ondulitas y bruma baja | Colores del suelo, ondulitas |
| `src/scene/rocks.js` | Forma, material y colocación de las rocas | Cantidad, tamaños, rocas de primer plano (`HERO_ROCKS`) |
| `src/scene/sky.js` | Degradado caramelo, velos de polvo y sol | Color del cielo, tamaño y brillo del sol |
| `src/scene/moons.js` | Fobos y Deimos: forma, cráteres, posición y fase | Tamaño y posición (`MOONS`) |
| `src/scene/lighting.js` | Luz del sol, luz de relleno y sombras | Intensidad y suavidad de las sombras |
| `src/scene/dust.js` | Partículas de polvo que acompañan a la cámara | Cantidad y brillo |
| `src/scene/post.js` | Bloom, tone mapping, viñeta, grano y etalonaje | Acabado de la imagen |

### Pruebas y documentación
| Archivo | Para qué sirve |
|---|---|
| `test/terrain-height.test.js` | Comprueba determinismo por semilla, rangos de altura, borde lejano y pedregosidad |
| `docs/adr/0001-stack-y-escena-ilustrativa.md` | Decisión de stack y qué elementos de la escena son licencia artística |
| `.check/screenshot.png` | Última captura de `npm run check`; se regenera y no se versiona |

## Comandos
| Comando | Qué hace |
|---|---|
| `npm run dev` | Prende el servidor con recarga en vivo |
| `npm run check` | Revisa la página en Chrome invisible y guarda la captura; sale con código 1 si hay errores |
| `npm test` | Corre las pruebas del dominio |
| `npm run build` | Genera la versión de producción en `dist/`; todavía no se ha ejecutado |

## Pendientes conocidos
- **Borde lejano:** a la derecha parece más un banco de polvo que montañas.
- **Duna derecha:** el patrón fino de las ondulitas podría parpadear con el paneo.
- **Sombras de las rocas:** son discretas porque el sol está de frente y caen hacia la cámara.
- **Rendimiento:** no se han medido los FPS ni fijado presupuestos, como pide `CLAUDE.md`.
- **Accesibilidad:** falta soporte de teclado.
- **Exactitud científica:** el terreno aún no usa datos reales y las posiciones de las lunas no salen de efemérides.
