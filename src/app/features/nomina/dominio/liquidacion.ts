import { Bolsa, SubTramo, TipoHora, TIPOS_HORA, bolsaVacia } from './particion-horas';
import { Vigencia } from './vigencias';

export interface DatosPago {
  salarioBase: number | null;
  valorHora: number | null;
}

export interface Liquidacion {
  base: number;
  recargoNocturno: number;
  recargoFestivo: number;
  recargoNocturnoFestivo: number;
  extras: Bolsa;
  totalRecargos: number;
  totalExtras: number;
  total: number;
}

/** Valor manual de la hora o salario / (horas semanales / 6 × 30). Con 42 h: salario / 210. */
export function valorHora(pago: DatosPago, v: Vigencia): number {
  if (pago.valorHora) return pago.valorHora;
  if (pago.salarioBase) return pago.salarioBase / ((v.horasSemanales / 6) * 30);
  return 0;
}

/** Porcentaje que aplica a cada tipo de hora. Nocturno en festivo suma ambos recargos. */
export function porcentaje(tipo: TipoHora, extra: boolean, v: Vigencia): number {
  if (extra) {
    const extraBase = tipo === 'nocturna' || tipo === 'nocturnaFestiva' ? v.pctExtraNocturna : v.pctExtraDiurna;
    return extraBase + (tipo === 'festiva' || tipo === 'nocturnaFestiva' ? v.pctFestivo : 0);
  }
  if (tipo === 'nocturna') return v.pctNocturno;
  if (tipo === 'festiva') return v.pctFestivo;
  if (tipo === 'nocturnaFestiva') return v.pctNocturno + v.pctFestivo;
  return 0;
}

/**
 * Horas no extra: base (h × valor hora) + recargo (h × valor hora × %).
 * Horas extra: h × valor hora × (1 + %). Cada tramo usa la vigencia de su día; se redondea al final por concepto.
 */
export function liquidar(subtramos: SubTramo[], pago: DatosPago): Liquidacion {
  let base = 0;
  const recargos = bolsaVacia();
  const extras = bolsaVacia();

  for (const s of subtramos) {
    const valor = (s.minutos / 60) * valorHora(pago, s.vigencia);
    const pct = porcentaje(s.tipo, s.extra, s.vigencia) / 100;
    if (s.extra) {
      extras[s.tipo] += valor * (1 + pct);
    } else {
      base += valor;
      recargos[s.tipo] += valor * pct;
    }
  }

  for (const t of TIPOS_HORA) extras[t] = Math.round(extras[t]);
  const r = {
    base: Math.round(base),
    recargoNocturno: Math.round(recargos.nocturna),
    recargoFestivo: Math.round(recargos.festiva),
    recargoNocturnoFestivo: Math.round(recargos.nocturnaFestiva),
  };
  const totalRecargos = r.recargoNocturno + r.recargoFestivo + r.recargoNocturnoFestivo;
  const totalExtras = TIPOS_HORA.reduce((suma, t) => suma + extras[t], 0);
  return { ...r, extras, totalRecargos, totalExtras, total: r.base + totalRecargos + totalExtras };
}
