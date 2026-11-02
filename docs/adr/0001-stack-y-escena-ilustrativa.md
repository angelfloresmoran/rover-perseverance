# ADR 0001: Stack inicial y escena ilustrativa de Marte

**Estado:** aceptada · **Fecha:** 2026-11-01

## Contexto
El proyecto necesita una base para render 3D en el navegador y una primera imagen rápida. Todavía no se ha integrado ningún dato real de Marte.

## Decisión
- **Vite y Three.js con JavaScript ES**, sin TypeScript por ahora.
- **`playwright-core` con el Chrome instalado** para `npm run check`; no descarga navegadores.
- **Escena 100 % procedural** con semilla fija, sin assets externos.
- La altura del terreno vive en `src/domain/`, sin dependencias gráficas; la presentación vive en `src/scene/`.

## Qué es real y qué no
Toda la escena es un **elemento ilustrativo**, no un dato real ni un modelo calibrado. La pantalla lo indica con una leyenda.

| Elemento | Licencia artística |
|---|---|
| Terreno | Generado con ruido; no representa el cráter Jezero. |
| Sol | Disco agrandado. |
| Fobos y Deimos | Muy agrandadas; posiciones elegidas por composición, no calculadas por efemérides. Formas y cráteres inventados. |
| Fase de las lunas | La luz se desplaza hacia la cámara para que se lean; a contraluz real serían crecientes finas. |
| Cielo | Cálido en toda su extensión; el atardecer marciano real es azulado junto al sol. |

## Consecuencias
- Rápido de iterar y sin licencias que gestionar.
- No sirve como referencia científica. Sustituir el terreno por datos reales (Mars Trek, HiRISE) y las posiciones por efemérides queda como trabajo futuro, con su propia ADR.
