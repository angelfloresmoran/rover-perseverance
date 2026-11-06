// Datos del rover Perseverance, en un único lugar. Unidades SI.
// "NASA" = https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/ (consultada el 2026-11-02).
// "Modelo" = medido en public/models/mars-2020-perseverance.glb. "Ilustrativo" = elegido para la simulación.

// Velocidad máxima real sobre suelo plano y duro: 152 m/h (NASA).
const REAL_TOP_SPEED_M_S = 152 / 3600;

// Licencia de simulación: a velocidad real, 10 m tardarían 4 minutos. Se indica en pantalla.
export const DRIVE_TIME_SCALE = 30;

export const ROVER_SPEC = Object.freeze({
  length_m: 3.0, // NASA
  width_m: 2.7, // NASA
  height_m: 2.2, // NASA
  wheelRadius_m: 0.2625, // NASA: 52.5 cm de diámetro; el modelo mide lo mismo
  realTopSpeed_m_s: REAL_TOP_SPEED_M_S,
  topSpeed_m_s: REAL_TOP_SPEED_M_S * DRIVE_TIME_SCALE, // Ilustrativo
  maxTilt_deg: 30, // NASA: los conductores evitan pasar de 30°; el diseño resiste 45°
  // NASA: obstáculos tan grandes como la rueda. La misma página cita también rocas de 40 cm.
  maxObstacleHeight_m: 0.525,
  // Caja del modelo en planta: left_m = +X del modelo, forward_m = +Z del modelo.
  footprint: Object.freeze({ halfWidth_m: 1.352, frontForward_m: 1.372, rearForward_m: -1.736 }), // Modelo
  // Centro de cada rueda en planta (Modelo). Altura del eje: axleHeight_m.
  axleHeight_m: 0.263, // Modelo
  wheels: Object.freeze([
    Object.freeze({ id: 'front-left', left_m: 1.062, forward_m: 1.095, steers: 1 }),
    Object.freeze({ id: 'middle-left', left_m: 1.184, forward_m: -0.09, steers: 0 }),
    Object.freeze({ id: 'rear-left', left_m: 1.062, forward_m: -1.165, steers: -1 }),
    Object.freeze({ id: 'front-right', left_m: -1.062, forward_m: 1.095, steers: 1 }),
    Object.freeze({ id: 'middle-right', left_m: -1.184, forward_m: -0.09, steers: 0 }),
    Object.freeze({ id: 'rear-right', left_m: -1.062, forward_m: -1.165, steers: -1 }),
  ]),
});

// Parámetros de manejo. Ilustrativos: no son datos de la misión.
export const DRIVE_TUNING = Object.freeze({
  acceleration_m_s2: 2.2,
  arcRadius_m: 4.5,
  turnInPlaceRate_rad_s: 0.35,
  steerResponse_per_s: 4,
  slowdownStartTilt_deg: 15,
  minSlopeSpeedFactor: 0.35,
  driveAreaRadius_m: 1400, // Antes de que empiece el borde del cráter procedural (1500 m)
});
