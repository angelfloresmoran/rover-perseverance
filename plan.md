# Plan: paisaje cinematográfico de Marte con Vite y Three.js

Este archivo tiene una sección por fase:
- **Fase 1, parte 1:** el plan tal como se aprobó antes de ejecutar.
- **Fase 1, parte 2:** lo que se hizo, cómo se hizo, para qué sirve cada componente y dónde encontrarlo.
- **Fase 2:** sombras creíbles y viento visible. **Bloque A hecho (commit `f3d8e1b`); bloque B pendiente de aprobación.**
- **Fase 3:** rover Perseverance conducible, al final del archivo. **Implementada, a la espera de revisión en pantalla del ingeniero.**

Regla de trabajo desde la fase 2: cada fase se planifica aquí primero y no se implementa hasta que el ingeniero la confirme.

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

---

# Fase 2: sombras creíbles y viento visible

**Estado:** bloque A implementado y a la espera de revisión del ingeniero. Bloque B sin empezar: requiere confirmación. El plan se conserva como se aprobó; lo hecho está en "Fase 2: registro del bloque A", al final.

## Objetivo
Que la escena se vea más real en dos aspectos: las sombras anclan los objetos al suelo y se nota que hay viento moviendo polvo y arena.

## Corroboración de lo que quedó pendiente
| Punto recordado | Qué dice el registro de la fase 1 | Qué se comprobó ahora |
|---|---|---|
| Sombras | Sí estaba: "discretas porque el sol está de frente" | Es cierto, pero la explicación era incompleta (ver causas) |
| Polvo y viento | **No estaba** entre los pendientes | El polvo casi no se ve; se agrega por pedido del ingeniero |

### Correcciones a lo registrado en la fase 1
- **Patrón fino de la duna derecha:** se atribuyó a las ondulitas, pero viene del filtro de sombras. Sigue ahí al quitar las ondulitas y desaparece al quitar las sombras.
- **"Nada está confirmado en git":** ya no es cierto; la fase 1 está en el commit `ecc0cf2`.

## Línea base medida
Medido con cámara fija, sin cambiar archivos del repo, en Chrome invisible con GPU Apple M1 Pro. `npm test` (5 de 5) y `npm run check` (0 errores) pasan.

| Medida | Valor |
|---|---|
| Píxeles que el polvo cambia más de 1 % | 0.57 % de la imagen |
| Píxeles que el polvo cambia más de 3 % | **0.02 %** de la imagen |
| Luz que conservan las zonas en sombra, respecto a la misma zona sin sombra | de 0.72 (casi invisible) a 0.11 (mancha muy oscura) |
| Dibujado por cuadro | 48 llamadas, 6.64 millones de triángulos. **Corregido:** esa medición sumó dos cuadros; lo real son 24 llamadas y 3.32 millones |
| Tiempo por cuadro a 1600×900 | mediana 16.7 ms, percentil 95 16.8 ms |
| Tiempo por cuadro a 2592×1675 (pantalla Retina con el límite actual de 1.5×) | mediana 16.7 ms, percentil 95 **33.4 ms** |

El tiempo por cuadro está limitado a 60 FPS, así que estas cifras no muestran cuánto margen queda. A la resolución alta ya se pierden cuadros **antes** de añadir nada.

## Causas encontradas

### Sombras
1. **Bordes igual de borrosos en todas partes.** Un solo mapa cubre 1240 m, unos 0.30 m por texel, y el filtro difumina cerca de 1.2 m. Por el tamaño aparente del sol desde Marte (cerca de 0.35°, cálculo propio), la penumbra transversal a 20 m sería de unos 0.12 m. Falta una sombra nítida en la base que se suavice al alejarse.
2. **Sombras despegadas.** `normalBias = 0.3` m separa la sombra de la base de las rocas pequeñas.
3. **Poca diferencia entre luz y sombra.** Con el sol a 8.5°, sobre arena plana el sol aporta solo un 40 % de la luz y el relleno del cielo el 60 %.
4. **Sin oclusión de contacto.** Nada oscurece el suelo justo bajo las rocas, y por eso parecen apoyadas encima y no asentadas.
5. **Piedras sin sombra.** Las 14 000 más pequeñas no proyectan ninguna.
6. **Bajar el relleno no basta.** Se probó con 0.55 y menos bias: las sombras se leen mucho mejor, pero las rocas se vuelven siluetas negras y la sombra de la duna derecha parece un agujero.

### Polvo y viento
1. **Brillo muy bajo.** El brillo base es 9 % en mezcla aditiva sobre arena y cielo ya claros.
2. **El tamaño no respeta la resolución.** `gl_PointSize` no considera el `pixelRatio`, así que en Retina las partículas se ven hasta 1.5 veces más pequeñas que en las capturas. En la pantalla real se notan todavía menos.
3. **Viento sin ráfagas.** Es un vector constante escrito dentro del shader; el cielo usa otro movimiento sin relación.
4. **Solo existe un tipo de polvo.** No hay arena rasante ni plumas en las crestas, que es lo que delata el viento a simple vista.
5. **Más puntos no daría realismo.** El polvo marciano en suspensión mide alrededor de 1 µm de radio, invisible como grano suelto. Lo que se percibe es neblina, plumas y arena en movimiento.

## Decisión a confirmar: altura del sol
Con sol bajo, la luz directa cruza mucha atmósfera. Estimación de primer orden (Beer-Lambert, atmósfera plana, profundidad óptica τ = 0.45):

| Elevación | Luz directa que llega | Luz sobre suelo plano (sen e) | Sombra de una roca de 3 m |
|---|---|---|---|
| **8.5° (actual)** | 5 % | 0.15 | 20 m |
| 12° | 12 % | 0.21 | 14 m |
| **16° (recomendada)** | 20 % | 0.28 | 10.5 m |
| 20° | 27 % | 0.34 | 8 m |

**Recomendación: subir el sol a unos 16°.** A 8.5° un Marte real tendría sombras muy tenues, así que sombras marcadas con ese sol contradirían el realismo que se busca. A 16° casi se duplica la luz directa sobre el suelo, las sombras siguen largas y el sol sigue en cuadro (el borde superior está cerca de 27°). A cambio, se pierde algo de aspecto de atardecer y se acortan las sombras. Si se prefiere conservar el atardecer, se mantiene 8.5° y se documenta como licencia artística.

## Alcance

**Dentro**
- Sombras en cascada, oclusión de contacto y balance de luz.
- Modelo de viento con ráfagas, y polvo en tres capas.
- Corrección del patrón de puntos y de las bandas de la duna derecha.
- Banco de medición repetible.

**Fuera, para fases posteriores**
- Rover, datos reales de Jezero y efemérides.
- Tolvaneras (dust devils): tienen respaldo científico y serían un buen añadido, pero conviene ver antes el polvo base.
- Borde lejano del cráter y soporte de teclado.

## Etapas

Son dos bloques. **Al terminar el bloque A se muestran capturas y se espera confirmación antes de empezar el B.**

### Bloque A: sombras

**Etapa 0. Banco de medición**
- `src/main.js`: parámetro `?t=<segundos>`, validado como número finito ≥ 0, que congela tiempo y cámara.
- `scripts/measure-look.mjs` (`npm run measure`): captura la escena con y sin cada efecto, y escribe `.check/metrics.json` con las métricas de esta fase y el tiempo de GPU si el navegador lo permite.
- Sirve para comparar con cifras y no a ojo. Se cumple si dos corridas con el mismo `t` dan la misma imagen.

**Etapa 1. Luz**
- `src/scene/look.js`: elevación del sol según la decisión confirmada.
- `src/scene/lighting.js`: menos relleno del cielo y más rebote cálido desde el suelo, para que el lado oscuro de las rocas no quede negro.
- Revisar que cielo, lunas y bruma sigan bien, porque dependen de la dirección del sol.

**Etapa 2. Sombras en cascada**
- `src/scene/lighting.js`, `terrain.js` y `rocks.js`: `CSM` de Three.js con 3 cascadas de 2048², cada una con su propio difuminado y bias. Cerca nítida, lejos suave.
- Encadenar los parches de shader: `CSM.setupMaterial` sobrescribe `onBeforeCompile` (`CSM.js:443`), y hay que declarar `customProgramCacheKey` para que terreno y rocas no compartan programa por error.
- Volver a calcular las sombras solo si la cámara se movió más de un umbral. El sol y el terreno no cambian, así que no hace falta repetirlo en cada cuadro.
- Probar sombra en las piedras pequeñas y dejarla solo si cabe en el presupuesto.

**Etapa 3. Oclusión de contacto**
- `src/domain/contact-occlusion.js` (nuevo, sin Three.js): calcula el oscurecimiento alrededor de cada roca, con pruebas en `test/`.
- `src/scene/rocks.js`: devuelve dónde colocó cada roca.
- `src/scene/terrain.js`: horneado en una textura, se aplica solo a la luz indirecta. Cuesta una lectura de textura; se descarta GTAO porque volvería a dibujar toda la escena en un equipo que ya pierde cuadros en Retina.
- Parte baja de las rocas algo más oscura.
- **Fin del bloque A: capturas y confirmación.**

### Bloque B: viento y polvo

**Etapa 4. Modelo de viento**
- `src/domain/wind.js` (nuevo, sin Three.js): dirección alineada con las dunas, velocidad con ráfagas y desplazamiento acumulado como integral exacta. Así las partículas no saltan al cambiar la velocidad y el resultado no depende de los FPS.
- `test/wind.test.js`: determinismo por semilla, rangos, y que el desplazamiento sea coherente con la velocidad.
- Leer el artículo completo de Newman et al. (2022) antes de fijar velocidades. Si no se pueden sustentar, quedan marcadas como ilustrativas.

**Etapa 5. Polvo visible en tres capas**
- **Suspendido** (`dust.js`): tamaño ajustado a la resolución, mezcla normal en lugar de solo aditiva, brillo a contraluz y densidad que sube con las ráfagas. Es licencia artística, porque el polvo real es demasiado fino para verse grano a grano, y así se documentará.
- **Arena rasante** (`src/scene/saltation.js`, nuevo): trazos alargados en el sentido del viento, a ras de suelo y concentrados en las crestas. Usa una textura de alturas generada desde el dominio.
- **Plumas de cresta y velos bajos** (`src/scene/dust-plumes.js`, nuevo): planos suaves animados que salen de las crestas y barren el suelo en cada ráfaga.
- `sky.js`: los velos del cielo se mueven con el mismo viento.
- `prefers-reduced-motion`: el polvo sigue visible, pero sin animación.

**Etapa 6. Suelo**
- `terrain.js`: bajar el ondulado amplio que dibuja las bandas oscuras en la duna derecha y alinear las ondulitas con el viento. Confirmar que el patrón de puntos ya no aparece tras la etapa 2.

**Etapa 7. Cierre**
- `docs/adr/0002-sombras-y-viento.md` y actualización de la leyenda en pantalla.
- Registro aquí de lo hecho y de dónde quedó cada cosa, incluido cualquier ajuste a CLAUDE.md que haga falta.
- `npm run build`, que nunca se ha ejecutado, y prueba de la versión generada.

## Criterios de aceptación
Los rangos son objetivos artísticos, no datos de Marte: no se encontró una fuente con la fracción de luz difusa para estas condiciones.

| Área | Criterio | Base |
|---|---|---|
| Sombras | Sobre arena, la zona en sombra conserva entre 0.40 y 0.65 de la luz (mediana) | de 0.72 a 0.11 según la zona |
| Sombras | Ningún núcleo de sombra por debajo de 0.20 | 0.11 |
| Sombras | Nacen pegadas a la base y sin patrón de puntos, revisado en recortes ampliados | Despegadas y con puntos |
| Polvo | Con viento normal, al menos 3 % de los píxeles cambia más de 3 % | 0.02 % |
| Polvo | En ráfaga, al menos 8 % de los píxeles cambia más de 3 % | No hay ráfagas |
| Polvo | Brillo medio de la imagen cambia 5 % o menos; sol y lunas siguen legibles | No aplica |
| Viento | Se distingue movimiento entre capturas separadas 0.5 s | Casi imperceptible |
| Rendimiento | A 1600×900, percentil 95 de 16.8 ms o menos | 16.8 ms |
| Rendimiento | A 2592×1675, mediana de 16.7 ms y percentil 95 de 33.4 ms o menos | 16.7 y 33.4 ms |
| Determinismo | Mismo `t`, misma imagen | Sin medición posible |
| General | `npm test`, `npm run check` y `npm run build` sin errores | Build sin ejecutar |
| Confirmación | El ingeniero lo revisa en su propia pantalla | Pendiente |

Se permiten hasta 3 rondas de ajuste por bloque. Si tras la tercera falta algo, se para y se informa qué falta. No se hacen commits salvo que el ingeniero lo pida.

## Riesgos
- **CSM no se ha probado en esta escena.** Si falla o se excede del presupuesto, la alternativa es un único mapa concentrado en los primeros 280 m, a costa de menor calidad lejana.
- **Rendimiento en Retina.** La fase añade trabajo a una escena que ya pierde cuadros. Si no se cumple el presupuesto, primero se reduce el número de partículas y luego el `pixelRatio`.
- **Chrome invisible no equivale a la pantalla real.** Por eso la última confirmación es del ingeniero.
- **Sigue siendo ilustrativa.** El terreno es procedural; "real" aquí significa creíble a la vista, no una reconstrucción de Jezero.

## Fuentes y qué falta verificar
| Dato | Fuente | Estado |
|---|---|---|
| τ típica en Jezero, cerca de 0.4–0.5 | [Mastcam-Z, BAAS](https://baas.aas.org/pub/2023n8i213p09) | Solo resumen |
| Polvo de 1.0–1.3 µm de radio efectivo | [Estudio con cámaras de MSL](https://www.cosmos.esa.int/documents/1499429/1583871/CHENCHEN_H.pdf) | Otro sitio (Gale) y periodo de poco polvo |
| Remolinos frecuentes y ráfagas que levantan polvo | [Newman et al. 2022](https://addi.ehu.eus/handle/10810/58188?show=full) | Solo resumen; leer completo en la etapa 4 |
| Distancia Sol-Marte | [NASA Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | Consultada en copia archivada |
| Sol de 0.35° visto desde Marte, penumbra y transmisión | Cálculo propio | Aproximación de primer orden |

---

# Fase 2: registro del bloque A

## Estado
- Etapas 0 a 3 hechas. **Sin commit:** los cambios están en el árbol de trabajo.
- `npm test`: 22 de 22. `npm run check`: 0 errores, 0 excepciones, 0 peticiones fallidas, 0 advertencias. `npm run build`: compila, con el aviso de que el paquete supera 500 kB.
- La versión generada por `npm run build` no se abrió en un navegador; eso sigue en la etapa 7.
- ADR 0002 y leyenda: quedan para la etapa 7, en el bloque B.

## Resultados
Medido con `npm run measure` a `t = 30`, con cámara fija. En tiempos, la cámara se mueve con el paneo.

| Medida | Antes | Después | Criterio |
|---|---|---|---|
| Luz conservada en sombra, mediana | 0.651 | **0.445** | 0.40–0.65: cumple |
| Luz conservada en sombra, mínimo | 0.11 | **0.221** | 0.20 o más: cumple |
| Mismo `t`, misma imagen | Sin medición | **0 píxeles distintos** | Cumple |
| Cuadro a 1600×900, percentil 95 | 16.7 ms | 16.7 ms | 16.8 ms o menos: cumple |
| Cuadro a 2592×1675, mediana y percentil 95 | 16.7 y 33.3 ms | 16.7 y 33.4 ms | 16.7 y 33.4 ms o menos: cumple |
| Cuadros en 6 s a 2592×1675 | 306 | 302 | Sin criterio |
| Triángulos por cuadro | 3.32 millones | **1.98 millones** | Sin criterio |
| GPU a 1600×900, mediana | 12.7 ms | 14.3 ms | Sin criterio |
| GPU a 1600×900 al recalcular las 3 cascadas | 14.0 ms | 16.2 ms | Sin criterio |

- **Sombras:** nacen pegadas a la base, y en los recortes ampliados ya no se ven los puntos ni la línea clara. Es una revisión visual, no una medida.
- **Tiempo de GPU a 2592×1675:** da unos 46 ms, más que el intervalo real entre cuadros, así que ese valor solo sirve para comparar corridas.
- **Polvo:** sin cambios (0.02 % de píxeles sobre 3 %). Es trabajo del bloque B.

## Decisiones durante la ejecución
| Decisión | Motivo |
|---|---|
| Sol a 16° | Recomendación del plan, aplicada sin respuesta explícita del ingeniero. Se puede revertir en `src/scene/look.js`. Hay captura alternativa a 8.5° |
| La sombra bloquea 76 % de la luz directa, no 100 % | Aproxima la aureola que forma el polvo alrededor del sol. Con 85 % los núcleos sobre la duna derecha bajaban a 0.15 |
| Rocas proyectan con ambas caras (`shadowSide: DoubleSide`) | Con solo las caras traseras la luz se colaba en la línea de contacto con el suelo |
| Piedras más pequeñas sin sombra | Costaban unos 9 ms al recalcular (19.5 a 28.5 ms) y casi no se notaban |
| Menos detalle: piedras pequeñas de 1 a 0, medianas de 3 a 2 | No estaba en el plan. Las cascadas bajaron los cuadros en Retina a 265; así vuelven a 302 sin diferencia visible en los recortes |
| Se mantiene la transición entre cascadas (`fade`) | Quitarla no ahorró tiempo medible |
| Luz: sol 4.6, relleno 0.92, rebote del suelo más cálido | Ajustado por medición para cumplir los criterios |

## Componentes nuevos o modificados
| Archivo | Para qué sirve | Qué tocar aquí |
|---|---|---|
| `src/scene/shadows.js` (nuevo) | Cascadas, caché de mapas y unión de parches de shader | `CASCADES`, `SHADOW_STRENGTH`, `SUN_INTENSITY` |
| `src/scene/lighting.js` | Crea las sombras y el relleno del cielo | Relleno y rebote |
| `src/scene/look.js` | Dirección del sol | Elevación en `SUN_DIRECTION` |
| `src/domain/contact-occlusion.js` (nuevo) | Oscurecimiento junto a las rocas, sin Three.js; modelo aproximado | Altura efectiva y alcance |
| `src/scene/terrain.js` | Hornea esa oclusión en una textura y la aplica a la luz indirecta | `CONTACT_REGION` |
| `src/scene/rocks.js` | Devuelve `placements` y oscurece la parte baja de las rocas | `TIERS`, `FOOTPRINT_RADIUS` |
| `src/frozen-time.js` (nuevo) | Lee y valida `?t=<segundos>` | Validación |
| `src/main.js` | Congela tiempo y paneo con `?t=`, actualiza sombras en cada cuadro | Orden del bucle |
| `scripts/measure-look.mjs` (nuevo) | `npm run measure`: captura con y sin cada efecto, escribe `.check/metrics.json` | Tiempo y resoluciones |
| `scripts/lib/look-metrics.mjs` (nuevo) | Métricas puras de imagen y tiempo | Umbrales |
| `scripts/lib/dev-server.mjs` (nuevo) | Servidor y Chrome compartidos por `check` y `measure` | Argumentos de Chrome |
| `test/contact-occlusion.test.js`, `test/frozen-time.test.js`, `test/look-metrics.test.js` (nuevos) | 17 pruebas nuevas | |
| `.check/bloque-a/` (no versionado) | Capturas `antes`, `despues-sol-16` y `alternativa-sol-8.5` | |

## Límites y pendientes
- **Sin comprobar en movimiento:** el giro de cámara se revisó con capturas, sin huecos ni errores, pero una captura no muestra si la sombra salta al recalcularse. Hay que mirarlo en pantalla.
- **Margen para el bloque B:** a 1600×900 quedan unos 2.4 ms de GPU, y en Retina ya se pierden cuadros. Es el principal riesgo del polvo; posiblemente haya que bajar el `pixelRatio`.
- **Alternativa a 8.5°:** solo se capturó; no se midió contra los criterios.
- **Vistos en otros ángulos:** las rocas iluminadas de frente tienen manchas oscuras muy marcadas (ya existían) y mirando en dirección opuesta al sol se repiten bandas en las dunas (etapa 6). Las manchas no están en el alcance de ningún bloque.

**Actualización:** el bloque A quedó confirmado por el ingeniero en el commit `f3d8e1b`. Su mensaje menciona polvo y ráfagas, pero el commit no modifica `dust.js` ni agrega viento: esa parte sigue pendiente en el bloque B.

---

# Fase 3: rover Perseverance conducible

**Estado:** implementada; ver "Fase 3: registro" al final. El plan se conserva como se aprobó.

## Objetivo
Traer el modelo 3D oficial de Perseverance a tamaño real sobre el terreno, conducirlo con WASD, que deje huellas, que la cámara lo siga, y escribir en la consola qué piezas son cámaras para usarlas más adelante.

## Lo que se comprobó del modelo

| Aspecto | Hallazgo | Consecuencia |
|---|---|---|
| Descarga | HTTP 200, 4 987 176 bytes, GLB válido, sha-256 `10db7c03a5e63a5a3b3e7baa6243aa4918ba045fa8ff0a731d0217491adc727f` | Se fija el hash y una prueba lo verifica |
| Compresión | Requiere `KHR_draco_mesh_compression`; carga con decodificador en 124 ms | El decodificador se sirve desde el proyecto, sin CDN |
| Escala | Ya está en metros. Ancho 2.705 m (NASA 2.7), rueda 0.525 m (NASA 0.525) | **No se reescala.** Una prueba lo verifica |
| Orientación | Frente en +Z; base en y = 0. Mástil a la derecha y RTG atrás, como el rover real | Solo hay que girarlo según el rumbo |
| Pose inicial | **Mástil y brazo plegados** (altura 1.85 m) | Se aplica la animación incluida hasta mástil arriba y brazo guardado |
| Mástil desplegado | Altura 2.23 m (NASA 2.2), cabeza a 2.0 m, brazo aún plegado hacia `t` = 2–4 s de las animaciones | Se elige el instante exacto en la implementación y se congela |
| Ruedas | Una sola malla con 3 materiales, pero se separan limpiamente en 6 grupos (unos 5800 vértices cada uno) con centros conocidos | Se separan al cargar para que giren |
| Suspensión | Una sola malla, no articulable | El cuerpo se inclina como un conjunto; las ruedas compensan poco en vertical. No es rocker-bogie articulado real |
| Costo | 199 521 triángulos, 252 mallas, 47 materiales | Pasa de 24 a unas 276 llamadas de dibujo por cuadro. Hay que medirlo |
| Vidrio | 3 materiales con `transmission = 1` | Three.js dibuja **toda la escena otra vez** cada cuadro si los hay. Se reemplazan por transparencia simple |
| Metales | 23 materiales metálicos, y la escena no tiene mapa de entorno | Se verían casi negros. Se les da un entorno propio, sin alterar terreno ni rocas |
| Licencia | El repositorio de NASA los declara "free and without copyright" y remite a sus guías de uso | Se atribuye a NASA/JPL-Caltech, sin insinuar respaldo de la NASA |

### Piezas que son cámaras (`console.log` al cargar)
No hay cámaras glTF: son piezas con nombre. Lista explícita, no un filtro por texto, porque "cam" dejaría fuera a WATSON e incluiría tapas:

| Nombre en el modelo | Cámara real |
|---|---|
| `Mastcam_Z_cams` | Mastcam-Z |
| `NavCams` | Navcams |
| `hazcams_front`, `hazcams_rear` | Hazcams delanteras y traseras |
| `WATSON` | WATSON (torreta del brazo) |
| `Up_Look_Camera`, `Down_Look_Camera` | Cámaras de descenso, por su nombre; **por confirmar** |
| `lens` | Lente en la cabeza del mástil, posiblemente SuperCam; **por confirmar** |

`hazcams_*_cover*` y `hazcams_rear_wiring` son tapas y cableado: se imprimen aparte como accesorios. Si falta algún nombre, se avisa con `console.warn`.

## Lo que se comprobó del terreno
- **La malla visible no coincide con `heightAt_m`.** Diferencia de altura en 40 000 puntos al azar: hasta 100 m del origen, percentil 95 de 13 cm y máximo de 74 cm; hasta 300 m, 29 cm y 1.3 m. Con la función actual las ruedas flotarían o se hundirían. **El rover usará la misma triangulación que la malla.**
- **Pendientes a escala de rover:** cerca del 5 % del área supera 30°, sobre todo las caras de avalancha. La NASA evita pasar de 30° y diseña para 45°. El rover se frena con la pendiente y se detiene al llegar a 30°.
- **Rocas:** hay rocas de hasta 6.5 m, más que el rover. La NASA indica que pasa obstáculos del tamaño de la rueda (52.5 cm).

## Decisiones a confirmar

### 1. Velocidad
La velocidad real máxima es de 152 m/h (4.2 cm/s): cruzar 10 m tardaría 4 minutos. **Recomiendo ×30, unos 1.27 m/s**, con el factor visible en pantalla. La constante real queda guardada aparte, y `Shift` no se agrega salvo que se pida. La alternativa es ×1, fiel pero poco manejable.

### 2. Orden respecto al bloque B
**Recomiendo terminar el rover primero**, como se pidió ahora. El polvo sigue casi invisible (0.02 %) y los dos compiten por el mismo margen de rendimiento, así que al retomar el bloque B habrá que medir con el rover en escena.

## Alcance

**Dentro:** modelo en `public/models/`, escala real, conducción, ruedas que giran, inclinación según el terreno, colisión con rocas grandes, límite de pendiente, huellas, cámara que sigue, lista de cámaras en consola.

**Fuera:** vistas desde las cámaras del rover (quedan para el final), control del brazo o del mástil, física dinámica, energía y comunicaciones, polvo levantado por las ruedas, datos reales de Jezero.

## Etapas

**Etapa 0. Recursos**
- `public/models/mars-2020-perseverance.glb`: nombre sin espacios, hash verificado por una prueba.
- `public/draco/`: decodificador copiado de la versión instalada de Three.js; una prueba verifica que coincida.
- `docs/data-sources.md` (nuevo): fuente, fecha, hash, licencia y atribución.

**Etapa 1. Dominio, sin Three.js y con pruebas**
- `src/domain/terrain-grid.js`: la cuadrícula y su triangulación, compartidas por la malla y el rover. La malla actual no debe cambiar: se comprueba con la misma imagen.
- `src/domain/rover-spec.js`: dimensiones, posición de ruedas, velocidad y límites, con unidad y fuente, en un único lugar.
- `src/domain/rover-kinematics.js`: paso fijo de 1/60 s, dirección con radio de giro, giro en el sitio, límite de pendiente, colisión y límite del área conducible antes del borde del cráter.
- `src/domain/rover-stance.js`: contacto de las 6 ruedas, plano ajustado, inclinación y altura.
- `src/domain/track-recorder.js`: registra tramos de huella cada cierta distancia.

**Etapa 2. Modelo en escena (`src/scene/rover.js`)**
- Carga con Draco y congela la pose desplegada.
- Separa las ruedas, reemplaza el vidrio y añade el entorno de los metales.
- Une todos sus materiales a las cascadas (`shadows.attach`); si no, recibirían el sol tres veces.
- Imprime las cámaras en consola.
- Si la carga falla: aviso en pantalla y escena funcionando. `window.__marsReady` espera al rover.

**Etapa 3. Conducción (`src/app/rover-controller.js`, `src/app/keyboard.js`)**
- W/S avanzan y retroceden; A/D giran; también flechas, por accesibilidad.
- Las teclas se liberan al perder el foco, para que el rover no siga solo.
- Simulación independiente de los FPS; el dibujo interpola entre pasos.
- Con `?t=` no hay simulación: el rover queda en su pose inicial y la captura sigue siendo repetible.

**Etapa 4. Huellas (`src/scene/tracks.js`)**
- Cintas ajustadas a la malla, una por rueda, con surcos de las garras en el shader y sombras de la escena.
- Búfer circular de longitud fija, para que la memoria no crezca. Menos marcadas en zonas de grava.

**Etapa 5. Cámara y sombras**
- `OrbitControls` sigue al rover, con suavizado independiente de los FPS. Vuelve detrás de él al conducir, salvo si el usuario giró la vista hace poco.
- Sustituye al paneo lento. Distancia entre 5 y 60 m, sin atravesar el suelo.
- `src/scene/shadows.js`: mientras el rover se mueve, se recalcula la cascada cercana. Las demás siguen en caché; hay que revisar que no queden sombras fantasma del rover en ellas.

**Etapa 6. Cierre**
- `docs/adr/0003-rover-conducible.md`, leyenda en pantalla y controles visibles.
- Ajustar `measure` y `check`, medir y registrar aquí. Hasta 3 rondas de ajuste.

## Criterios de aceptación
| Área | Criterio |
|---|---|
| Tamaño | Ancho, largo y alto del modelo a menos de 5 % de 2.7 × 3.0 × 2.2 m |
| Contacto | En un recorrido automático de prueba, la distancia rueda-suelo es de 5 cm o menos en el percentil 95, sobre la malla visible |
| Conducción | Prueba real en Chrome: cada tecla mueve o gira como corresponde, y el rover se detiene al soltar o perder el foco |
| Determinismo | Misma secuencia de teclas y misma semilla dan posición idéntica, a 30 o 144 FPS simulados |
| Límites | No sube por encima de 30°, no atraviesa rocas de más de 52.5 cm ni sale del área |
| Huellas | Visibles en captura detrás del rover, sin parpadeo ni flotación en recortes ampliados |
| Cámara | Rover en cuadro durante todo el recorrido de prueba; la vista se puede seguir girando |
| Consola | Imprime la lista de cámaras, con 0 errores y 0 advertencias en `npm run check` |
| Fallo de carga | Con la descarga bloqueada, hay aviso visible y la escena sigue funcionando |
| Rendimiento | Conduciendo a 1600×900, percentil 95 de 16.8 ms o menos; a 2592×1675, mediana de 16.7 ms y percentil 95 de 33.4 ms o menos |
| General | `npm test`, `npm run check` y `npm run build` sin errores; la versión generada carga el modelo |
| Confirmación | El ingeniero lo conduce en su propia pantalla |

## Riesgos
- **Rendimiento:** es el principal riesgo. Si no se cumple el presupuesto, en este orden: unir mallas por material, conservando por nombre las piezas de cámara; quitar sombra a piezas pequeñas; bajar el `pixelRatio`.
- **Dirección visible:** las ruedas pueden girar, pero la horquilla forma parte de la suspensión, que no se articula. Si se ve mal al girar, las ruedas solo rodarán y el rumbo cambiará igual.
- **Rocas pequeñas:** el rover las atraviesa visualmente, porque no hay física de contacto rueda-roca.
- **Tamaño de las rocas:** las más grandes son decorativas y desproporcionadas frente al rover real.
- **Cámaras por confirmar:** `lens`, `Up_Look_Camera` y `Down_Look_Camera` se identifican por nombre y ubicación, no por documentación del modelo.

## Fuentes
| Dato | Fuente |
|---|---|
| Modelo y condiciones de uso | [NASA-3D-Resources](https://github.com/nasa/NASA-3D-Resources), [guías de uso](https://www.nasa.gov/nasa-brand-center/images-and-media) |
| 3 × 2.7 × 2.2 m, 1025 kg | [JPL, press kit](https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/quick_facts/) |
| Rueda de 52.5 cm, 152 m/h | [NASA, ruedas](https://mars.nasa.gov/mars2020/spacecraft/rover/wheels) |
| 45° de diseño, 30° en operación, obstáculos del tamaño de la rueda | [NASA, componentes del rover](https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/) |

Las cifras de NASA se leyeron en extractos de búsqueda; se revisarán las páginas completas al escribir `rover-spec.js`.

---

# Fase 3: registro

## Estado
- Aprobada por el ingeniero. Sin respuesta explícita en dos puntos, se aplicó lo recomendado: **velocidad ×30** y **rover antes que el bloque B**. Sol en 16°.
- **Sin commit:** los cambios están en el árbol de trabajo.
- `npm test`: 65 de 65. `npm run check`: 0 errores, 0 excepciones, 0 peticiones fallidas, 0 advertencias. `npm run check:drive`: 24 de 24. `npm run measure`: mismo `t`, misma imagen. `npm run build`: compila, con el aviso de paquete mayor de 500 kB; la versión generada se abrió y se condujo sin errores.

## Criterios de aceptación
| Área | Resultado | Cumple |
|---|---|---|
| Tamaño | 3.11 × 2.70 × 2.23 m frente a 3 × 2.7 × 2.2 m: 3.6, 0.2 y 1.5 % de diferencia | Sí |
| Contacto | Rueda-suelo de 5 cm o menos en el percentil 95, en un recorrido de 106 s sobre la malla y las rocas reales | Sí |
| Conducción | Teclas en Chrome real: W, S, A, D y flechas; se detiene al soltar y al perder el foco | Sí |
| Determinismo | Estado idéntico a 30, 60 y 144 FPS | Sí |
| Límites | No pasa de 30°, no atraviesa rocas grandes, no sale del área | Sí |
| Huellas | Visibles y con marcas de las garras en capturas y recortes; el reciclado tras 600 m tiene prueba | Sí |
| Cámara | Rover en cuadro en todo el recorrido (máximo 0.32 de la mitad de la pantalla); la vista se puede girar | Sí |
| Consola | Imprime la lista de cámaras | Sí |
| Fallo de carga | Con la descarga bloqueada: aviso visible y escena a 61 cuadros por segundo | Sí |
| Rendimiento | Tabla siguiente | Sí, con poco margen |
| Confirmación en pantalla | | **Pendiente** |

## Rendimiento
Chrome invisible, Apple M1 Pro. El tiempo por cuadro está limitado a 60 FPS.

| Medida | Antes | Quieto | Conduciendo | Presupuesto |
|---|---|---|---|---|
| Llamadas de dibujo | 24 | 304 | 304 | |
| Triángulos por cuadro | 1.98 M | 2.25 M | 2.25 M | |
| 1600×900, mediana / percentil 95 | 16.7 / 16.7 ms | 16.7 / 16.8 ms | 16.7 / 16.8 ms | 16.8 ms: cumple |
| 2592×1675, mediana / percentil 95 | 16.7 / 33.4 ms | 16.7 / 33.3 ms | 16.7 / 33.4 ms | 16.7 y 33.4 ms: cumple |
| Cuadros contados en 6 s a 2592×1675 | 300 | 300 | **269** | Sin criterio |
| GPU a 1600×900, mediana | 13.8 ms | 17.0 ms | 14.7 ms | Sin criterio |

Conduciendo en Retina se pasa de unos 51 a 46 cuadros por segundo. El presupuesto se cumple, pero **a 1600×900 casi no queda margen de GPU**. El polvo del bloque B no cabrá sin optimizar antes.

## Decisiones durante la ejecución
| Decisión | Motivo |
|---|---|
| Se agregó `scripts/drive-check.mjs` (`npm run check:drive`), no prevista en el plan | Deja repetible la prueba de conducción real, antes pensada como manual |
| Rocas de más de 52.5 cm como obstáculo | La página de la NASA cita también 40 cm; se mantuvo el plan |
| Huellas por multiplicación, sin material iluminado | Conservan sombra y bruma del suelo, sin costo de luces |
| No se unieron mallas por material | El presupuesto se cumple sin hacerlo; queda disponible |
| Dirección visible en las ruedas, hasta unos 20° | En la captura de cerca no choca con la horquilla |
| El paneo lento se eliminó | Lo sustituye la cámara que sigue al rover |
| `window.__marsReady` espera al rover | Sin esto, las mediciones capturarían la escena sin él |

## Corrección encontrada
Las reescrituras de `measure` insertaban una instrucción tras un `if` sin llaves, y la señal de "listo" se activaba antes de tiempo. No afectó a los resultados anteriores por la espera posterior. Se corrigió en `src/main.js`.

## Componentes nuevos o modificados
| Archivo | Para qué sirve | Qué tocar aquí |
|---|---|---|
| `public/models/mars-2020-perseverance.glb` (nuevo) | Modelo oficial, sin modificar | No editar: una prueba verifica su hash |
| `public/draco/` (nuevo) | Decodificador del modelo | Volver a copiar al actualizar Three.js |
| `docs/data-sources.md` (nuevo) | Origen, hash, licencia y fuentes del rover | |
| `docs/adr/0003-rover-conducible.md` (nuevo) | Decisión y qué es real | |
| `src/domain/terrain-grid.js` (nuevo) | Alturas y triangulación compartidas por malla y rover | Resolución de la malla |
| `src/domain/rover-spec.js` (nuevo) | Datos del rover con fuente, y parámetros de manejo | `DRIVE_TIME_SCALE`, `DRIVE_TUNING` |
| `src/domain/rover-kinematics.js` (nuevo) | Movimiento, pendientes, colisión y límites | Reglas de movimiento |
| `src/domain/rover-stance.js` (nuevo) | Inclinación y contacto de las ruedas | Recorrido de las ruedas |
| `src/domain/track-recorder.js` (nuevo) | Registro de huellas en búfer circular | |
| `src/app/rover-controller.js` (nuevo) | Paso fijo e interpolación | `ROVER_START` |
| `src/app/keyboard.js` (nuevo) | Teclas de conducción | Asignación de teclas |
| `src/scene/rover.js` (nuevo) | Carga, pose, ruedas, materiales y consola | `CAMERA_PARTS`, `DEPLOYED_POSE_S` |
| `src/scene/tracks.js` (nuevo) | Dibujo de las huellas | Aspecto y capacidad |
| `src/scene/chase-camera.js` (nuevo) | Cámara que sigue al rover | Distancias y suavizado |
| `src/scene/shadows.js` | Recalcula la cascada cercana si el rover se mueve | |
| `src/scene/terrain.js`, `rocks.js` | Malla desde la cuadrícula; altura de cada roca | |
| `src/main.js`, `index.html` | Integración, controles visibles y atribución | |
| `scripts/drive-check.mjs` (nuevo), `measure-look.mjs` | Prueba de conducción; medición conduciendo | |
| `test/` | `terrain-grid`, `rover-domain`, `rover-scene`, `rover-assets`, `track-recorder`, `tracks`, `keyboard` (nuevos) | |

## Límites y pendientes
- **Sin comprobar a ojo:** ni la fluidez en tu pantalla, ni que las ruedas se vean rodar en el sentido correcto (está calculado, no observado en movimiento), ni posibles saltos de sombra al recalcularse.
- **Cámaras por confirmar:** `lens`, `Up_Look_Camera` y `Down_Look_Camera` no tienen documentación en el modelo.
- **Cámara y rocas:** la cámara no choca con ellas, y una roca puede tapar al rover o quedar atravesada. Hay rocas tan grandes que estorban la vista.
- **Rocas pequeñas:** el rover las atraviesa visualmente.
- **Sombras en el encuadre nuevo:** mediana 0.392 y mínimo 0.169, frente a los objetivos de la fase 2 (0.40 y 0.20). La vista cambió y la medida incluye ahora el rover; el mínimo es un punto muy pequeño en el contacto de una roca cercana. No se ajustó.
- **Bloque B:** sigue pendiente; el polvo sigue casi invisible.
