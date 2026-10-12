import { Pipe, PipeTransform } from '@angular/core';
import { aHHmm } from './dominio/tiempo';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

@Pipe({ name: 'pesos' })
export class PesosPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return valor === null || valor === undefined ? '—' : COP.format(valor);
  }
}

/** Minutos → '7 h 30 min'. */
@Pipe({ name: 'horas' })
export class HorasPipe implements PipeTransform {
  transform(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    if (!h) return `${m} min`;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
}

/** Minutos desde la medianoche → 'HH:mm'. */
@Pipe({ name: 'hhmm' })
export class HhmmPipe implements PipeTransform {
  transform(minutos: number): string {
    return aHHmm(minutos);
  }
}
