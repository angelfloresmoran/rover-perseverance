# Perseverancia

## Introducción

**Perseverancia** es una simulación 3D del rover **Perseverance** explorando la superficie de **Marte**. El proyecto es, a la vez, un ejercicio de exploración del desarrollo de software hecho **exclusivamente con Claude Code**: buscamos mostrar que desarrollar con IA es compatible con una buena arquitectura, buenas prácticas y seguridad.

## Forma de trabajo

### Flujo general
1. **Entender** el problema y el contexto antes de escribir código.
2. **Especificar** la funcionalidad (spec breve) y acordar el alcance.
3. **Planear** el enfoque y las decisiones de arquitectura relevantes.
4. **Implementar** en pasos pequeños y verificables.
5. **Probar** con pruebas automatizadas y ejecución real.
6. **Revisar** calidad, seguridad y exactitud científica.
7. **Documentar** lo necesario para continuar.

### Principios de colaboración con IA
- La IA propone, **el ingeniero decide**. Todo cambio se revisa y se entiende antes de aceptarlo.
- Pedir justificación además de código; verificar siempre ejecutando, no asumiendo.
- Cambios pequeños e incrementales, fáciles de revisar.

### Specs principales
Cada funcionalidad se describe con una spec corta: objetivo, alcance, criterios de aceptación y supuestos. Las áreas principales del proyecto, a confirmar y refinar conforme avancemos:

| Área | Qué cubre |
|---|---|
| **Terreno de Marte** | Representación 3D de la superficie del cráter Jezero a partir de datos reales (elevación, texturas), con niveles de detalle. |
| **Rover** | Modelo 3D de Perseverance, movimiento sobre el terreno, ruedas, mástil y brazo robótico. |
| **Simulación física** | Gravedad marciana, contacto con el suelo, cinemática y dinámica del rover, tiempo simulado. |
| **Misión y exploración** | Rutas, puntos de interés, toma de muestras y estado del rover (energía, comunicaciones). |
| **Entorno** | Cielo, iluminación, ciclo día/noche (sol marciano) y atmósfera. |
| **Interfaz y cámaras** | Controles, vistas del rover, información en pantalla y accesibilidad. |
| **Datos** | Ingesta, caché y atribución de datos oficiales (NASA/JPL/USGS). |

### En qué es relevante trabajar primero
1. Definir el stack tecnológico y la estructura base del proyecto (decisión pendiente, se documentará como ADR).
2. Terreno básico de Marte renderizado a partir de datos reales.
3. Rover con movimiento simple sobre el terreno.
4. Capa de simulación separada del renderizado, con pruebas.
5. Interfaz, cámaras y funciones de misión.

### Convenciones
- Documentación y comunicación en español; código (nombres) en inglés.
- Commits claros y descriptivos; cada funcionalidad incluye sus pruebas y, si aplica, su documentación.

## Arquitectura y buenas prácticas

### Arquitectura
- Capas: **datos** → **dominio/física** → **aplicación** → **presentación**.
- Bajo acoplamiento y alta cohesión; el dominio no depende de librerías gráficas ni de la interfaz.
- Proveedores de datos externos detrás de interfaces, para poder sustituirlos o simularlos en pruebas.
- Decisiones de diseño documentadas (ADRs breves); preferir soluciones simples y evolutivas.

### Desarrollo de software
- SOLID, DRY, KISS y YAGNI como brújula, no como dogma.
- Código legible, con nombres expresivos y funciones pequeñas.
- Pruebas automatizadas en cada funcionalidad; refactorizar siempre con pruebas que respalden el cambio.

### Seguridad
- Nunca versionar secretos ni claves (por ejemplo, la API de NASA); usar variables de entorno o un proxy propio.
- Validar y sanear toda entrada externa, incluidos los datos descargados.
- Mínimo privilegio, dependencias actualizadas y de procedencia revisada, y OWASP Top 10 desde el diseño.
- Revisar con ojo crítico el código generado por IA: la seguridad no se delega.

### Exactitud científica y datos
- Usar fuentes oficiales y citables (NASA PDS/Mars Trek/HiRISE/MOLA, ESA, JPL SPICE/Horizons, USGS); registrar fuente, versión, fecha y licencia.
- Respetar marcos de referencia y sistemas de coordenadas (IAU Mars 2000); constantes físicas en un único lugar, con unidad y fuente.
- Distinguir siempre **dato real**, **modelo aproximado** y **elemento ilustrativo**; indicar exageraciones visuales.
- Verificar contra fuentes oficiales cualquier fórmula, constante o cifra propuesta por la IA.

### Unidades y tiempo
- SI internamente; convertir solo en los bordes. Variables con unidad cuando los tipos no la expresen (`distance_km`, `speed_m_s`).
- Distinguir UTC, TDB/TT y tiempo solar marciano (sol, Ls, LMST).
- Cuidar la precisión de punto flotante en grandes distancias (doble precisión, floating origin).

### Simulación
- Reproducible y determinista: mismos parámetros y semilla, mismo resultado; registrar versiones y parámetros.
- Modelo físico independiente del renderizado y del framerate; integradores con paso adecuado y estabilidad justificada.
- Validar contra casos y datos de referencia; cubrir casos límite (polos, antimeridiano, valores nulos).

### Representación y rendimiento
- Teselas, LOD y carga progresiva para terrenos grandes; medir antes de optimizar y fijar presupuestos (fps, memoria, descarga).
- Accesibilidad: contraste, alternativas al color, soporte de teclado.

### Licencias
- Verificar licencias de imágenes, modelos 3D y datos; dar la atribución requerida.
- Respetar límites de peticiones de servicios públicos y usar caché.

---

*El buen software se construye con constancia, aprendizaje continuo y disciplina. Empecemos, una funcionalidad a la vez.*
