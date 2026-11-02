// Lee `?t=<segundos>` de la URL: congela tiempo y cámara para capturas repetibles.
// Devuelve null si falta o no es un número finito mayor o igual que cero.
export function parseFrozenTime_s(search) {
  const raw = new URLSearchParams(search).get('t');
  if (raw === null || raw.trim() === '') return null;
  const time_s = Number(raw);
  return Number.isFinite(time_s) && time_s >= 0 ? time_s : null;
}
