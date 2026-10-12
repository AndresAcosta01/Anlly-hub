import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ErrorFila, FilaLeida, descargarPlantilla } from '../../../../shared/excel/excel';
import { Analisis, ImportadorExcel } from '../../../../shared/excel/importador-excel';
import { Avisos } from '../../../../shared/ui/avisos';
import { EstadoVacio } from '../../../../shared/ui/estado-vacio';
import { Icono } from '../../../../shared/ui/icono';
import { Agente, Festivo, NominaDatos, NuevoRegistro, Registro, VigenciaGuardada } from '../../datos/nomina-datos';
import {
  Bolsa,
  TIPOS_HORA,
  Tramo,
  bolsaVacia,
  duracionTramo,
  partirTramo,
  seCruzan,
} from '../../dominio/particion-horas';
import { aHHmm, aMinutos, fechaDesdePartes, hoy, sumarDias } from '../../dominio/tiempo';
import { HhmmPipe, HorasPipe } from '../../pipes';
import { PLANTILLA_HORAS } from '../../plantillas';
import { COLOR_TIPO, NOMBRE_TIPO } from '../../tipos-hora';

interface RegistroImportado extends NuevoRegistro {
  id?: string;
}

@Component({
  selector: 'app-registro-horas',
  imports: [FormsModule, Icono, EstadoVacio, ImportadorExcel, HorasPipe, HhmmPipe],
  templateUrl: './registro-horas.html',
})
export class RegistroHoras implements OnInit {
  private readonly datos = inject(NominaDatos);
  private readonly avisos = inject(Avisos);
  private readonly campoEntrada = viewChild<ElementRef<HTMLInputElement>>('campoEntrada');

  protected readonly plantilla = PLANTILLA_HORAS;
  protected readonly nombreTipo = NOMBRE_TIPO;
  protected readonly colorTipo = COLOR_TIPO;
  protected readonly tipos = TIPOS_HORA;

  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly importando = signal(false);
  protected readonly agentes = signal<Agente[]>([]);
  protected readonly vigencias = signal<VigenciaGuardada[]>([]);
  protected readonly festivos = signal<Festivo[]>([]);
  protected readonly registros = signal<Registro[]>([]);

  // Filtros (mes actual por defecto)
  protected readonly desde = signal(hoy().slice(0, 8) + '01');
  protected readonly hasta = signal(this.finDeMes(hoy()));
  protected readonly filtroAgente = signal('');

  // Formulario de captura
  protected readonly editandoId = signal<string | null>(null);
  protected readonly agenteId = signal('');
  protected readonly fecha = signal(hoy());
  protected readonly entrada = signal('');
  protected readonly salida = signal('');
  protected readonly observacion = signal('');

  protected readonly agentesActivos = computed(() => this.agentes().filter((a) => a.activo));
  protected readonly nombres = computed(() => new Map(this.agentes().map((a) => [a.id, a.nombre])));
  private readonly setFestivos = computed(() => new Set(this.festivos().map((f) => f.fecha)));
  private readonly esFestivo = (f: string) => this.setFestivos().has(f);

  protected readonly tramoForm = computed<Tramo | null>(() => {
    const entrada = aMinutos(this.entrada());
    const salida = aMinutos(this.salida());
    if (entrada === null || salida === null || entrada === salida || !this.fecha()) return null;
    return { fecha: this.fecha(), entrada, salida };
  });

  /** Vista previa del reparto mientras se escribe. */
  protected readonly vistaPrevia = computed(() => {
    const t = this.tramoForm();
    return t && this.vigencias().length ? this.reparto(t) : null;
  });

  async ngOnInit(): Promise<void> {
    try {
      const [agentes, vigencias, festivos] = await Promise.all([
        this.datos.agentes(),
        this.datos.vigencias(),
        this.datos.festivos(),
      ]);
      this.agentes.set(agentes);
      this.vigencias.set(vigencias);
      this.festivos.set(festivos);
      await this.cargarRegistros();
    } catch (e) {
      this.avisos.error((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  protected async cargarRegistros(): Promise<void> {
    try {
      this.registros.set(
        await this.datos.registros(this.desde(), this.hasta(), this.filtroAgente() || undefined),
      );
    } catch (e) {
      this.avisos.error((e as Error).message);
    }
  }

  private finDeMes(fecha: string): string {
    const [a, m] = fecha.split('-').map(Number);
    return sumarDias(fechaDesdePartes(a, m + 1, 1), -1);
  }

  protected reparto(t: Tramo): Bolsa {
    const b = bolsaVacia();
    for (const s of partirTramo(t, this.esFestivo, this.vigencias())) b[s.tipo] += s.minutos;
    return b;
  }

  protected duracion(t: Tramo): number {
    return duracionTramo(t);
  }

  protected cruzaMedianoche(t: Tramo): boolean {
    return t.salida <= t.entrada;
  }

  protected editar(r: Registro): void {
    this.editandoId.set(r.id);
    this.agenteId.set(r.agenteId);
    this.fecha.set(r.fecha);
    this.entrada.set(aHHmm(r.entrada));
    this.salida.set(aHHmm(r.salida));
    this.observacion.set(r.observacion ?? '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected cancelarEdicion(): void {
    this.editandoId.set(null);
    this.entrada.set('');
    this.salida.set('');
    this.observacion.set('');
  }

  protected async guardar(): Promise<void> {
    const t = this.tramoForm();
    if (!t || !this.agenteId()) {
      this.avisos.error('Completa agente, fecha, entrada y salida (distintas).');
      return;
    }
    this.guardando.set(true);
    try {
      // Revisa cruces con los tramos del agente del día anterior, el mismo y el siguiente.
      const cercanos = await this.datos.registros(sumarDias(t.fecha, -1), sumarDias(t.fecha, 1), this.agenteId());
      const choque = cercanos.find((r) => r.id !== this.editandoId() && seCruzan(r, t));
      if (choque) {
        this.avisos.error(
          `Se cruza con otro tramo del ${choque.fecha} (${aHHmm(choque.entrada)}–${aHHmm(choque.salida)}).`,
        );
        return;
      }
      await this.datos.guardarRegistro(
        { agenteId: this.agenteId(), ...t, observacion: this.observacion().trim() || null },
        this.editandoId() ?? undefined,
      );
      this.avisos.exito(this.editandoId() ? 'Tramo actualizado.' : 'Tramo guardado.');
      // Deja agente y fecha listos para el siguiente tramo.
      this.cancelarEdicion();
      this.campoEntrada()?.nativeElement.focus();
      await this.cargarRegistros();
    } catch (e) {
      this.avisos.error((e as Error).message);
    } finally {
      this.guardando.set(false);
    }
  }

  protected async eliminar(r: Registro): Promise<void> {
    if (!confirm(`¿Eliminar el tramo de ${this.nombres().get(r.agenteId)} del ${r.fecha}?`)) return;
    try {
      await this.datos.eliminarRegistro(r.id);
      this.avisos.exito('Tramo eliminado.');
      await this.cargarRegistros();
    } catch (e) {
      this.avisos.error((e as Error).message);
    }
  }

  protected descargarPlantilla(): void {
    void descargarPlantilla(this.plantilla);
  }

  // ─── Importación ───
  protected readonly analizar = async (filas: FilaLeida[]): Promise<Analisis<RegistroImportado>> => {
    const r: Analisis<RegistroImportado> = { nuevos: [], duplicados: [], errores: [] };
    const porDocumento = new Map(this.agentes().map((a) => [a.documento, a.id]));
    const error = (fila: number, columna: string, valor: string, mensaje: string): ErrorFila => ({ fila, columna, valor, mensaje });

    const candidatos: { fila: number; reg: RegistroImportado }[] = [];
    for (const { fila, valores: v } of filas) {
      const agenteId = porDocumento.get(String(v['documento']));
      if (!agenteId) {
        r.errores.push(error(fila, 'Documento', String(v['documento']), 'No existe un agente con ese documento. Créalo primero en Agentes.'));
        continue;
      }
      const reg: RegistroImportado = {
        agenteId,
        fecha: String(v['fecha']),
        entrada: aMinutos(String(v['entrada']))!,
        salida: aMinutos(String(v['salida']))!,
        observacion: (v['observacion'] as string | null) ?? null,
      };
      if (reg.entrada === reg.salida) {
        r.errores.push(error(fila, 'Salida', String(v['salida']), 'La entrada y la salida no pueden ser iguales.'));
        continue;
      }
      candidatos.push({ fila, reg });
    }
    if (!candidatos.length) return r;

    const fechas = candidatos.map((c) => c.reg.fecha).sort();
    const existentes = await this.datos.registros(sumarDias(fechas[0], -1), sumarDias(fechas.at(-1)!, 1));
    const aceptados: { fila: number; reg: RegistroImportado }[] = [];

    for (const c of candidatos) {
      const mismo = existentes.find(
        (e) => e.agenteId === c.reg.agenteId && e.fecha === c.reg.fecha && e.entrada === c.reg.entrada,
      );
      const choqueArchivo = aceptados.find((a) => a.reg.agenteId === c.reg.agenteId && seCruzan(a.reg, c.reg));
      const choqueBase = existentes.find((e) => e !== mismo && e.agenteId === c.reg.agenteId && seCruzan(e, c.reg));
      if (choqueArchivo) {
        r.errores.push(error(c.fila, 'Entrada', aHHmm(c.reg.entrada), `Se cruza con la fila ${choqueArchivo.fila} del archivo.`));
      } else if (choqueBase) {
        r.errores.push(error(c.fila, 'Entrada', aHHmm(c.reg.entrada), `Se cruza con un tramo ya registrado el ${choqueBase.fecha} (${aHHmm(choqueBase.entrada)}–${aHHmm(choqueBase.salida)}).`));
      } else if (mismo) {
        r.duplicados.push({ ...c.reg, id: mismo.id });
        aceptados.push(c);
      } else {
        r.nuevos.push(c.reg);
        aceptados.push(c);
      }
    }
    return r;
  };

  protected readonly guardarImportacion = async (
    nuevos: unknown[],
    duplicados: unknown[],
    actualizar: boolean,
  ): Promise<void> => {
    if (nuevos.length) await this.datos.crearRegistros(nuevos as NuevoRegistro[]);
    if (actualizar) {
      for (const { id, ...reg } of duplicados as RegistroImportado[]) {
        await this.datos.guardarRegistro(reg, id);
      }
    }
  };

  protected async finImportacion(importado: boolean): Promise<void> {
    this.importando.set(false);
    if (importado) await this.cargarRegistros();
  }
}
