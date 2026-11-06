// Registra las huellas de cada rueda en un búfer circular: la memoria no crece aunque se conduzca sin parar.
// Sin dependencias gráficas. Unidades: metros.

export function createTrackRecorder({ wheelCount, capacity, step_m }) {
  const wheels = Array.from({ length: wheelCount }, () => ({
    written: 0,
    anchor: null,
    x_m: 0,
    z_m: 0,
    crossX: 0,
    crossZ: 0,
    distance_m: 0,
  }));

  function emit(wheel, wheelIndex, x_m, z_m, crossX, crossZ, distance_m) {
    const index = wheel.written % capacity;
    const sample = {
      wheelIndex,
      index,
      // Solo se une a la muestra anterior si existe.
      previousIndex: wheel.written === 0 ? null : (index + capacity - 1) % capacity,
      x_m,
      z_m,
      crossX,
      crossZ,
      distance_m,
    };
    wheel.written++;
    wheel.x_m = x_m;
    wheel.z_m = z_m;
    wheel.crossX = crossX;
    wheel.crossZ = crossZ;
    wheel.distance_m = distance_m;
    return sample;
  }

  return {
    // Devuelve las muestras nuevas de esta rueda; vacío si aún no avanzó lo suficiente.
    record(wheelIndex, x_m, z_m) {
      const wheel = wheels[wheelIndex];
      if (wheel.anchor === null) {
        wheel.anchor = { x_m, z_m };
        return [];
      }
      const fromX = wheel.written === 0 ? wheel.anchor.x_m : wheel.x_m;
      const fromZ = wheel.written === 0 ? wheel.anchor.z_m : wheel.z_m;
      const dx = x_m - fromX;
      const dz = z_m - fromZ;
      const moved_m = Math.hypot(dx, dz);
      if (moved_m < step_m) return [];

      let crossX = dz / moved_m;
      let crossZ = -dx / moved_m;
      const samples = [];
      if (wheel.written === 0) {
        samples.push(emit(wheel, wheelIndex, fromX, fromZ, crossX, crossZ, 0));
      } else if (crossX * wheel.crossX + crossZ * wheel.crossZ < 0) {
        // Al invertir la marcha, la sección se mantiene orientada para no retorcer la cinta.
        crossX = -crossX;
        crossZ = -crossZ;
      }
      samples.push(emit(wheel, wheelIndex, x_m, z_m, crossX, crossZ, wheel.distance_m + moved_m));
      return samples;
    },
  };
}
