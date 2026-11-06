# Fuentes de datos y recursos externos

## Modelo 3D de Perseverance
| Campo | Valor |
|---|---|
| Archivo | `public/models/mars-2020-perseverance.glb` |
| Origen | [NASA-3D-Resources](https://github.com/nasa/NASA-3D-Resources), rama `master`, `3D Models/Mars 2020 Perseverance Rover/Mars 2020 Perseverance Rover.glb` |
| Descarga | 2026-11-02 |
| Tamaño | 4 987 176 bytes |
| SHA-256 | `10db7c03a5e63a5a3b3e7baa6243aa4918ba045fa8ff0a731d0217491adc727f`, verificado por `test/rover-assets.test.js` |
| Tipo | Modelo publicado por la NASA, sin modificar. En ejecución se separan las ruedas y se simplifica el vidrio |
| Atribución en pantalla | "Modelo 3D: NASA/JPL-Caltech" |

**Condiciones.** El repositorio declara sus recursos "free and without copyright" y remite a las [guías de uso de la NASA](https://www.nasa.gov/nasa-brand-center/images-and-media). Esas guías piden reconocer a la NASA como fuente. Los logotipos e insignias no son de dominio público y su uso está protegido, y no se debe insinuar respaldo de la NASA. Si el proyecto se usa con fines comerciales o promocionales, hay que revisar las guías, sobre todo si se ve algún logotipo en las texturas del modelo.

## Decodificador Draco
| Campo | Valor |
|---|---|
| Archivos | `public/draco/draco_decoder.wasm`, `public/draco/draco_wasm_wrapper.js` |
| Origen | `node_modules/three/examples/jsm/libs/draco/gltf/`, de Three.js 0.187.0 |
| Por qué se copia | Se sirve desde el proyecto, sin depender de una CDN |
| Control | `test/rover-assets.test.js` falla si deja de coincidir con la versión instalada |

Al actualizar Three.js hay que volver a copiar estos dos archivos.

## Datos del rover
Fuente: [NASA, componentes de Perseverance](https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/), consultada el 2026-11-02. Los valores y su uso están en `src/domain/rover-spec.js`.

| Dato | Valor | Nota |
|---|---|---|
| Dimensiones | 3 × 2.7 × 2.2 m | |
| Masa | 1025 kg | Sin uso todavía |
| Rueda | 52.5 cm de diámetro | Un pie de foto de la misma página dice 52.6 cm |
| Velocidad máxima | 152 m/h | En suelo plano y duro |
| Inclinación | 30° en operación, 45° de diseño | Se usa 30° |
| Obstáculos | Tan grandes como la rueda | La misma página cita también rocas de 40 cm; se usa 52.5 cm |
