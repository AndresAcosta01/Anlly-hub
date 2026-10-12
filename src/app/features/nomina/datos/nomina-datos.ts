import { Injectable, inject } from '@angular/core';
import { PostgrestError } from '@supabase/supabase-js';
import { Supabase, mensajeError } from '../../../core/supabase';
import { aHHmm, aMinutos } from '../dominio/tiempo';
import { Vigencia } from '../dominio/vigencias';

export interface Agente {
  id: string;
  documento: string;
  nombre: string;
  salarioBase: number | null;
  valorHora: number | null;
  jornadaDiariaHoras: number | null;
  activo: boolean;
}

export type NuevoAgente = Omit<Agente, 'id'>;

export interface VigenciaGuardada extends Vigencia {
  id: string;
}

export interface Festivo {
  fecha: string;
  nombre: string;
  origen: 'generado' | 'manual';
}

export interface Registro {
  id: string;
  agenteId: string;
  fecha: string;
  entrada: number;
  salida: number;
  observacion: string | null;
}

export type NuevoRegistro = Omit<Registro, 'id'>;

/** Lanza el error de Supabase con un mensaje legible; si no hay error, devuelve los datos. */
function datos<T>(r: { data: T | null; error: PostgrestError | null }): T {
  if (r.error) throw new Error(mensajeError(r.error));
  return r.data as T;
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

const agenteDesdeFila = (f: Record<string, unknown>): Agente => ({
  id: f['id'] as string,
  documento: f['documento'] as string,
  nombre: f['nombre'] as string,
  salarioBase: num(f['salario_base']),
  valorHora: num(f['valor_hora']),
  jornadaDiariaHoras: num(f['jornada_diaria_horas']),
  activo: f['activo'] as boolean,
});

const agenteAFila = (a: NuevoAgente) => ({
  documento: a.documento,
  nombre: a.nombre,
  salario_base: a.salarioBase,
  valor_hora: a.valorHora,
  jornada_diaria_horas: a.jornadaDiariaHoras,
  activo: a.activo,
});

const vigenciaDesdeFila = (f: Record<string, unknown>): VigenciaGuardada => ({
  id: f['id'] as string,
  vigenteDesde: f['vigente_desde'] as string,
  inicioNocturno: aMinutos(f['inicio_nocturno'] as string)!,
  finNocturno: aMinutos(f['fin_nocturno'] as string)!,
  pctNocturno: Number(f['pct_nocturno']),
  pctFestivo: Number(f['pct_festivo']),
  pctExtraDiurna: Number(f['pct_extra_diurna']),
  pctExtraNocturna: Number(f['pct_extra_nocturna']),
  horasSemanales: Number(f['horas_semanales']),
  jornadaDiariaHoras: Number(f['jornada_diaria_horas']),
  inicioSemana: Number(f['inicio_semana']),
});

const vigenciaAFila = (v: Vigencia) => ({
  vigente_desde: v.vigenteDesde,
  inicio_nocturno: aHHmm(v.inicioNocturno),
  fin_nocturno: aHHmm(v.finNocturno),
  pct_nocturno: v.pctNocturno,
  pct_festivo: v.pctFestivo,
  pct_extra_diurna: v.pctExtraDiurna,
  pct_extra_nocturna: v.pctExtraNocturna,
  horas_semanales: v.horasSemanales,
  jornada_diaria_horas: v.jornadaDiariaHoras,
  inicio_semana: v.inicioSemana,
});

const registroDesdeFila = (f: Record<string, unknown>): Registro => ({
  id: f['id'] as string,
  agenteId: f['agente_id'] as string,
  fecha: f['fecha'] as string,
  entrada: aMinutos(f['entrada'] as string)!,
  salida: aMinutos(f['salida'] as string)!,
  observacion: (f['observacion'] as string | null) ?? null,
});

const registroAFila = (r: NuevoRegistro) => ({
  agente_id: r.agenteId,
  fecha: r.fecha,
  entrada: aHHmm(r.entrada),
  salida: aHHmm(r.salida),
  observacion: r.observacion || null,
});

@Injectable({ providedIn: 'root' })
export class NominaDatos {
  private readonly db = inject(Supabase).cliente;

  // ─── Agentes ───
  async agentes(): Promise<Agente[]> {
    return datos(await this.db.from('agentes').select('*').order('nombre')).map(agenteDesdeFila);
  }

  async guardarAgente(a: NuevoAgente, id?: string): Promise<void> {
    const consulta = id
      ? this.db.from('agentes').update(agenteAFila(a)).eq('id', id)
      : this.db.from('agentes').insert(agenteAFila(a));
    datos(await consulta);
  }

  async eliminarAgente(id: string): Promise<void> {
    datos(await this.db.from('agentes').delete().eq('id', id));
  }

  /** Inserta en bloque; con `actualizar`, los documentos existentes se sobrescriben. */
  async importarAgentes(lista: NuevoAgente[], actualizar: boolean): Promise<void> {
    datos(
      await this.db
        .from('agentes')
        .upsert(lista.map(agenteAFila), { onConflict: 'documento', ignoreDuplicates: !actualizar }),
    );
  }

  // ─── Vigencias de recargos ───
  async vigencias(): Promise<VigenciaGuardada[]> {
    return datos(
      await this.db.from('vigencias_recargos').select('*').order('vigente_desde', { ascending: false }),
    ).map(vigenciaDesdeFila);
  }

  async guardarVigencia(v: Vigencia, id?: string): Promise<void> {
    const consulta = id
      ? this.db.from('vigencias_recargos').update(vigenciaAFila(v)).eq('id', id)
      : this.db.from('vigencias_recargos').insert(vigenciaAFila(v));
    datos(await consulta);
  }

  async eliminarVigencia(id: string): Promise<void> {
    datos(await this.db.from('vigencias_recargos').delete().eq('id', id));
  }

  // ─── Festivos ───
  async festivos(): Promise<Festivo[]> {
    return datos(await this.db.from('festivos').select('*').order('fecha')) as Festivo[];
  }

  async guardarFestivos(lista: Festivo[], actualizar: boolean): Promise<void> {
    datos(
      await this.db
        .from('festivos')
        .upsert(lista, { onConflict: 'fecha', ignoreDuplicates: !actualizar }),
    );
  }

  async eliminarFestivo(fecha: string): Promise<void> {
    datos(await this.db.from('festivos').delete().eq('fecha', fecha));
  }

  // ─── Registros de horas ───
  async registros(desde: string, hasta: string, agenteId?: string): Promise<Registro[]> {
    let consulta = this.db
      .from('registros_horas')
      .select('id, agente_id, fecha, entrada, salida, observacion')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('entrada', { ascending: false });
    if (agenteId) consulta = consulta.eq('agente_id', agenteId);
    return datos(await consulta).map(registroDesdeFila);
  }

  async guardarRegistro(r: NuevoRegistro, id?: string): Promise<void> {
    const consulta = id
      ? this.db.from('registros_horas').update(registroAFila(r)).eq('id', id)
      : this.db.from('registros_horas').insert(registroAFila(r));
    datos(await consulta);
  }

  async crearRegistros(lista: NuevoRegistro[]): Promise<void> {
    datos(await this.db.from('registros_horas').insert(lista.map(registroAFila)));
  }

  async eliminarRegistro(id: string): Promise<void> {
    datos(await this.db.from('registros_horas').delete().eq('id', id));
  }
}
