/** Minutos en un día. */
export const DIA = 1440;

/** Convierte 'HH:mm' o 'HH:mm:ss' a minutos desde la medianoche. Devuelve null si es inválida. */
export function aMinutos(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Convierte minutos desde la medianoche a 'HH:mm'. */
export function aHHmm(minutos: number): string {
  const m = ((minutos % DIA) + DIA) % DIA;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Las fechas se manejan como texto 'YYYY-MM-DD' y se operan en UTC para evitar corrimientos de zona. */
function aUtc(fecha: string): Date {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

function desdeUtc(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function esFechaValida(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && desdeUtc(aUtc(fecha)) === fecha;
}

export function fechaDesdePartes(anio: number, mes: number, dia: number): string {
  return desdeUtc(new Date(Date.UTC(anio, mes - 1, dia)));
}

export function sumarDias(fecha: string, dias: number): string {
  const f = aUtc(fecha);
  f.setUTCDate(f.getUTCDate() + dias);
  return desdeUtc(f);
}

export function diasDesdeEpoca(fecha: string): number {
  return aUtc(fecha).getTime() / 86_400_000;
}

/** 0 = domingo … 6 = sábado. */
export function diaSemana(fecha: string): number {
  return aUtc(fecha).getUTCDay();
}

/** Fecha en que empieza la semana de `fecha`; `inicio` es el día de la semana (1 = lunes). */
export function inicioSemana(fecha: string, inicio: number): string {
  return sumarDias(fecha, -((diaSemana(fecha) - inicio + 7) % 7));
}

/** Fecha de hoy en la zona local, como 'YYYY-MM-DD'. */
export function hoy(): string {
  const d = new Date();
  return fechaDesdePartes(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
