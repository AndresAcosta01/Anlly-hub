import { diaSemana, fechaDesdePartes, sumarDias } from './tiempo';

export interface FestivoGenerado {
  fecha: string;
  nombre: string;
}

/** Domingo de Pascua (algoritmo anónimo gregoriano). */
export function domingoDePascua(anio: number): string {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return fechaDesdePartes(anio, mes, dia);
}

/** Traslada al lunes siguiente (Ley 51 de 1983); si ya es lunes, queda igual. */
function alLunes(fecha: string): string {
  return sumarDias(fecha, (1 - diaSemana(fecha) + 7) % 7);
}

const FIJOS: [number, number, string][] = [
  [1, 1, 'Año Nuevo'],
  [5, 1, 'Día del Trabajo'],
  [7, 20, 'Día de la Independencia'],
  [8, 7, 'Batalla de Boyacá'],
  [12, 8, 'Inmaculada Concepción'],
  [12, 25, 'Navidad'],
];

const TRASLADABLES: [number, number, string][] = [
  [1, 6, 'Reyes Magos'],
  [3, 19, 'San José'],
  [6, 29, 'San Pedro y San Pablo'],
  [8, 15, 'Asunción de la Virgen'],
  [10, 12, 'Día de la Raza'],
  [11, 1, 'Todos los Santos'],
  [11, 11, 'Independencia de Cartagena'],
];

/** Los 18 festivos de Colombia del año, ordenados por fecha. */
export function generarFestivos(anio: number): FestivoGenerado[] {
  const pascua = domingoDePascua(anio);
  return [
    ...FIJOS.map(([m, d, nombre]) => ({ fecha: fechaDesdePartes(anio, m, d), nombre })),
    ...TRASLADABLES.map(([m, d, nombre]) => ({
      fecha: alLunes(fechaDesdePartes(anio, m, d)),
      nombre,
    })),
    { fecha: sumarDias(pascua, -3), nombre: 'Jueves Santo' },
    { fecha: sumarDias(pascua, -2), nombre: 'Viernes Santo' },
    { fecha: sumarDias(pascua, 43), nombre: 'Ascensión del Señor' },
    { fecha: sumarDias(pascua, 64), nombre: 'Corpus Christi' },
    { fecha: sumarDias(pascua, 71), nombre: 'Sagrado Corazón' },
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));
}
