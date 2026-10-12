import { generarFestivos } from './festivos-colombia';
import { liquidar, valorHora } from './liquidacion';
import { Tramo, clasificarTramos, resumirMinutos } from './particion-horas';
import { aMinutos, inicioSemana } from './tiempo';
import { Vigencia } from './vigencias';

const V: Vigencia = {
  vigenteDesde: '2026-07-15',
  inicioNocturno: 19 * 60,
  finNocturno: 6 * 60,
  pctNocturno: 35,
  pctFestivo: 90,
  pctExtraDiurna: 25,
  pctExtraNocturna: 75,
  horasSemanales: 42,
  jornadaDiariaHoras: 8,
  inicioSemana: 1,
};

const festivos2026 = new Set(generarFestivos(2026).map((f) => f.fecha));
const esFestivo = (f: string) => festivos2026.has(f);
const tramo = (fecha: string, entrada: string, salida: string): Tramo => ({
  fecha,
  entrada: aMinutos(entrada)!,
  salida: aMinutos(salida)!,
});
const resumen = (tramos: Tramo[], vigencias = [V]) =>
  resumirMinutos(clasificarTramos(tramos, esFestivo, vigencias));

describe('tiempo', () => {
  it('convierte horas y calcula el inicio de semana (lunes)', () => {
    expect(aMinutos('07:30')).toBe(450);
    expect(aMinutos('24:00')).toBeNull();
    expect(inicioSemana('2026-08-09', 1)).toBe('2026-08-03');
  });
});

describe('festivos de Colombia', () => {
  it('genera los 18 festivos de 2026', () => {
    expect([...festivos2026]).toEqual([
      '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01',
      '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29', '2026-07-20', '2026-08-07',
      '2026-08-17', '2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25',
    ]);
  });
});

describe('partición de horas', () => {
  it('08–16 en día hábil: todo ordinario', () => {
    expect(resumen([tramo('2026-08-04', '08:00', '16:00')]).normales.ordinaria).toBe(480);
  });

  it('14–22: 5 h ordinarias y 3 h nocturnas', () => {
    const r = resumen([tramo('2026-08-04', '14:00', '22:00')]);
    expect(r.normales).toMatchObject({ ordinaria: 300, nocturna: 180 });
  });

  it('22–06 de hábil a festivo: 2 h nocturnas y 6 h nocturnas festivas', () => {
    const r = resumen([tramo('2026-08-06', '22:00', '06:00')]);
    expect(r.normales).toMatchObject({ nocturna: 120, nocturnaFestiva: 360 });
  });

  it('18–02 de festivo a hábil: 1 h festiva, 5 h nocturna festiva, 2 h nocturna', () => {
    const r = resumen([tramo('2026-08-07', '18:00', '02:00')]);
    expect(r.normales).toEqual({ ordinaria: 0, festiva: 60, nocturnaFestiva: 300, nocturna: 120 });
  });

  it('el domingo paga como festivo', () => {
    expect(resumen([tramo('2026-08-09', '08:00', '16:00')]).normales.festiva).toBe(480);
  });

  it('dos tramos el mismo día (almuerzo excluido) no generan extra', () => {
    const r = resumen([tramo('2026-08-04', '08:00', '12:00'), tramo('2026-08-04', '13:00', '17:00')]);
    expect(r.normales.ordinaria).toBe(480);
    expect(r.extras.ordinaria).toBe(0);
  });
});

describe('horas extra', () => {
  it('10 h en un día: 2 h extra', () => {
    const r = resumen([tramo('2026-08-04', '08:00', '18:00')]);
    expect(r.normales.ordinaria).toBe(480);
    expect(r.extras.ordinaria).toBe(120);
  });

  it('6 días de 8 h: 6 h extra por superar las 42 h semanales', () => {
    const dias = ['10', '11', '12', '13', '14', '15'].map((d) => tramo(`2026-08-${d}`, '08:00', '16:00'));
    const r = resumen(dias);
    expect(r.normales.ordinaria).toBe(2520);
    expect(r.extras.ordinaria).toBe(360);
  });

  it('día largo dentro de semana larga: no cuenta doble', () => {
    const dias = ['10', '11', '12', '13', '14'].map((d) => tramo(`2026-08-${d}`, '08:00', '16:00'));
    const r = resumen([...dias, tramo('2026-08-15', '08:00', '18:00')]);
    expect(r.normales.ordinaria).toBe(2520);
    expect(r.extras.ordinaria).toBe(480);
  });
});

describe('liquidación', () => {
  const pago = { salarioBase: 2_100_000, valorHora: null };

  it('valor hora con 42 h: salario / 210', () => {
    expect(valorHora(pago, V)).toBe(10_000);
  });

  it('14–22: base + recargo nocturno', () => {
    const l = liquidar(clasificarTramos([tramo('2026-08-04', '14:00', '22:00')], esFestivo, [V]), pago);
    expect(l.base).toBe(80_000);
    expect(l.recargoNocturno).toBe(10_500);
    expect(l.total).toBe(90_500);
  });

  it('10 h: 2 h extra diurnas al 125 %', () => {
    const l = liquidar(clasificarTramos([tramo('2026-08-04', '08:00', '18:00')], esFestivo, [V]), pago);
    expect(l.extras.ordinaria).toBe(25_000);
    expect(l.total).toBe(105_000);
  });

  it('cada tramo usa la vigencia de su día (80 % → 90 % al cruzar el 1 de julio)', () => {
    const antes: Vigencia = { ...V, vigenteDesde: '2026-01-01', pctFestivo: 80 };
    const despues: Vigencia = { ...V, vigenteDesde: '2026-07-01' };
    const subtramos = clasificarTramos(
      [tramo('2026-06-30', '22:00', '06:00')],
      () => true,
      [antes, despues],
    );
    const l = liquidar(subtramos, { salarioBase: null, valorHora: 10_000 });
    // 2 h × 10.000 × 115 % + 6 h × 10.000 × 125 %
    expect(l.recargoNocturnoFestivo).toBe(98_000);
  });
});
