import { DIA, diaSemana, diasDesdeEpoca, inicioSemana, sumarDias } from './tiempo';
import { Vigencia, vigenciaPara } from './vigencias';

export type TipoHora = 'ordinaria' | 'nocturna' | 'festiva' | 'nocturnaFestiva';

export const TIPOS_HORA: TipoHora[] = ['ordinaria', 'nocturna', 'festiva', 'nocturnaFestiva'];

/** Un tramo trabajado (ya sin almuerzo). Horas en minutos desde la medianoche de `fecha`. */
export interface Tramo {
  fecha: string;
  entrada: number;
  salida: number;
}

/** Porción de un tramo con un solo tipo de hora. `inicio` es en minutos desde la medianoche de la fecha del tramo. */
export interface SubTramo {
  /** Fecha del tramo al que pertenece (la de entrada). */
  fechaTramo: string;
  dia: string;
  inicio: number;
  minutos: number;
  tipo: TipoHora;
  extra: boolean;
  vigencia: Vigencia;
}

export type Bolsa = Record<TipoHora, number>;

export interface ResumenMinutos {
  normales: Bolsa;
  extras: Bolsa;
}

export function bolsaVacia(): Bolsa {
  return { ordinaria: 0, nocturna: 0, festiva: 0, nocturnaFestiva: 0 };
}

/** Si la salida es igual o anterior a la entrada, el tramo termina al día siguiente. */
export function duracionTramo(t: Tramo): number {
  return t.salida > t.entrada ? t.salida - t.entrada : t.salida + DIA - t.entrada;
}

export function validarTramo(t: Tramo): string | null {
  if (t.entrada === t.salida) return 'La entrada y la salida no pueden ser iguales.';
  return null;
}

/** True si dos tramos del mismo agente se solapan en el tiempo. */
export function seCruzan(a: Tramo, b: Tramo): boolean {
  const inicioA = diasDesdeEpoca(a.fecha) * DIA + a.entrada;
  const inicioB = diasDesdeEpoca(b.fecha) * DIA + b.entrada;
  return inicioA < inicioB + duracionTramo(b) && inicioB < inicioA + duracionTramo(a);
}

function esNocturno(minuto: number, v: Vigencia): boolean {
  return v.inicioNocturno > v.finNocturno
    ? minuto >= v.inicioNocturno || minuto < v.finNocturno
    : minuto >= v.inicioNocturno && minuto < v.finNocturno;
}

/** Divide un tramo por medianoche y por el inicio/fin de la jornada nocturna de cada día. Los domingos pagan como festivo. */
export function partirTramo(
  t: Tramo,
  esFestivo: (fecha: string) => boolean,
  vigencias: Vigencia[],
): SubTramo[] {
  const inicio = t.entrada;
  const fin = inicio + duracionTramo(t);
  const cortes = new Set([inicio, fin]);
  for (let d = 0; d * DIA < fin; d++) {
    const v = vigenciaPara(sumarDias(t.fecha, d), vigencias);
    for (const c of [d * DIA, d * DIA + v.inicioNocturno, d * DIA + v.finNocturno]) {
      if (c > inicio && c < fin) cortes.add(c);
    }
  }
  const puntos = [...cortes].sort((a, b) => a - b);

  return puntos.slice(0, -1).map((a, i) => {
    const dia = sumarDias(t.fecha, Math.floor(a / DIA));
    const vigencia = vigenciaPara(dia, vigencias);
    const nocturno = esNocturno(a % DIA, vigencia);
    const festivo = esFestivo(dia) || diaSemana(dia) === 0;
    const tipo: TipoHora = festivo
      ? nocturno
        ? 'nocturnaFestiva'
        : 'festiva'
      : nocturno
        ? 'nocturna'
        : 'ordinaria';
    return { fechaTramo: t.fecha, dia, inicio: a, minutos: puntos[i + 1] - a, tipo, extra: false, vigencia };
  });
}

/**
 * Parte los tramos de un agente y marca como extra lo que supere la jornada diaria (por fecha del tramo)
 * o las horas semanales. Al acumulado semanal solo suman minutos no extra, así nada se cuenta doble.
 */
export function clasificarTramos(
  tramos: Tramo[],
  esFestivo: (fecha: string) => boolean,
  vigencias: Vigencia[],
  jornadaDiariaAgente?: number | null,
): SubTramo[] {
  const ordenados = [...tramos].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.entrada - b.entrada,
  );
  const porDia = new Map<string, number>();
  const porSemana = new Map<string, number>();
  const resultado: SubTramo[] = [];

  for (const t of ordenados) {
    const v = vigenciaPara(t.fecha, vigencias);
    const limiteDia = (jornadaDiariaAgente ?? v.jornadaDiariaHoras) * 60;
    const limiteSemana = v.horasSemanales * 60;
    const semana = inicioSemana(t.fecha, v.inicioSemana);

    for (const s of partirTramo(t, esFestivo, vigencias)) {
      const dia = porDia.get(t.fecha) ?? 0;
      const sem = porSemana.get(semana) ?? 0;
      const normales = Math.min(s.minutos, Math.max(0, Math.min(limiteDia - dia, limiteSemana - sem)));
      const extras = s.minutos - normales;
      if (normales) resultado.push({ ...s, minutos: normales });
      if (extras) resultado.push({ ...s, inicio: s.inicio + normales, minutos: extras, extra: true });
      porDia.set(t.fecha, dia + s.minutos);
      porSemana.set(semana, sem + normales);
    }
  }
  return resultado;
}

export function resumirMinutos(subtramos: SubTramo[]): ResumenMinutos {
  const r = { normales: bolsaVacia(), extras: bolsaVacia() };
  for (const s of subtramos) (s.extra ? r.extras : r.normales)[s.tipo] += s.minutos;
  return r;
}
