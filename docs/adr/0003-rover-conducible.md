# ADR 0003: Rover conducible con el modelo oficial de la NASA

**Estado:** aceptada · **Fecha:** 2026-11-02

## Contexto
Se quiere conducir Perseverance a tamaño real sobre el terreno. El modelo oficial viene comprimido con Draco, con el mástil plegado y las seis ruedas en una sola malla. La altura del terreno que calcula el dominio difiere de la malla visible hasta decenas de centímetros.

## Decisión
- **Cinemática, no dinámica.** `src/domain/rover-kinematics.js` es una función pura con paso fijo de 1/60 s. Mismas entradas, mismo resultado, a cualquier FPS.
- **Una sola superficie.** `src/domain/terrain-grid.js` hornea las alturas y reproduce la triangulación de la malla. La malla y el rover la comparten, así que las ruedas pisan lo que se dibuja.
- **Apoyo por plano ajustado.** Sobre seis puntos de contacto, sin articular el rocker-bogie, porque la suspensión del modelo es una sola malla. Cada rueda compensa hasta 12 cm.
- **Recursos en el proyecto.** Modelo y decodificador se sirven desde `public/`, sin CDN, con el hash del modelo verificado por una prueba.
- **Huellas por multiplicación.** Se multiplica el color del suelo ya iluminado, sin recalcular luz: conservan sombras, bruma y relieve con un costo mínimo.
- **Sombra del rover.** Mientras se mueve se recalcula solo la cascada cercana; el rover siempre queda dentro de ella por el límite de distancia de la cámara.

## Qué es real y qué no
| Elemento | Tipo |
|---|---|
| Forma y tamaño del rover | **Dato real**: modelo de NASA/JPL-Caltech, sin reescalar |
| Velocidad máxima de 152 m/h, límite de 30°, obstáculos de 52.5 cm | **Dato real**, en `rover-spec.js` |
| Velocidad ×30 | **Licencia**, indicada en pantalla |
| Aceleración, radio y velocidad de giro | **Ilustrativo** |
| Inclinación por plano ajustado | **Modelo aproximado** |
| Altura de las rocas para decidir si son obstáculo | **Modelo aproximado**: no hay contacto rueda-roca |
| Marcas de las garras en las huellas | **Ilustrativo**: separación agrandada para que se lean |

## Consecuencias
- Probar la conducción no requiere navegador, y las pruebas recorren el terreno y las rocas reales.
- Al actualizar Three.js hay que volver a copiar el decodificador; una prueba avisa si difieren.
- Se pasa de 24 a 304 llamadas de dibujo. El presupuesto se cumple, pero queda poco margen. Unir mallas por material es la siguiente optimización disponible.
- La suspensión no se ve articulada. Mostrarla exigiría separar esa malla o usar otro modelo.
