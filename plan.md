# Plan: paisaje cinematográfico de Marte con Vite y Three.js

Este archivo tiene una sección por fase:
- **Fase 1, parte 1:** el plan tal como se aprobó antes de ejecutar.
- **Fase 1, parte 2:** lo que se hizo, cómo se hizo, para qué sirve cada componente y dónde encontrarlo.
- **Fase 2:** sombras creíbles y viento visible, al final del archivo. **Bloque A hecho; bloque B pendiente de aprobación.**

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
