/** Reglas de recargos vigentes a partir de una fecha. Porcentajes en enteros (35 = 35 %). */
export interface Vigencia {
  vigenteDesde: string;
  inicioNocturno: number;
  finNocturno: number;
  pctNocturno: number;
  pctFestivo: number;
  pctExtraDiurna: number;
  pctExtraNocturna: number;
  horasSemanales: number;
  jornadaDiariaHoras: number;
  /** Día en que empieza la semana para horas extra: 0 = domingo, 1 = lunes. */
  inicioSemana: number;
}

/** La vigencia más reciente que aplica a `fecha`; si ninguna aplica, la más antigua. */
export function vigenciaPara<V extends Vigencia>(fecha: string, vigencias: V[]): V {
  if (!vigencias.length) throw new Error('No hay vigencias de recargos configuradas.');
  const ordenadas = [...vigencias].sort((a, b) => a.vigenteDesde.localeCompare(b.vigenteDesde));
  return ordenadas.filter((v) => v.vigenteDesde <= fecha).at(-1) ?? ordenadas[0];
}
