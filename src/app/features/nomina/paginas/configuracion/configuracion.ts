import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FilaLeida, descargarPlantilla } from '../../../../shared/excel/excel';
import { Analisis, ImportadorExcel } from '../../../../shared/excel/importador-excel';
import { Avisos } from '../../../../shared/ui/avisos';
import { EstadoVacio } from '../../../../shared/ui/estado-vacio';
import { Icono } from '../../../../shared/ui/icono';
import { Festivo, NominaDatos, VigenciaGuardada } from '../../datos/nomina-datos';
import { generarFestivos } from '../../dominio/festivos-colombia';
import { aHHmm, aMinutos, hoy } from '../../dominio/tiempo';
import { Vigencia, vigenciaPara } from '../../dominio/vigencias';
import { HhmmPipe } from '../../pipes';
import { PLANTILLA_FESTIVOS } from '../../plantillas';

interface FormVigencia extends Omit<Vigencia, 'inicioNocturno' | 'finNocturno'> {
  inicioNocturno: string;
  finNocturno: string;
}

@Component({
  selector: 'app-configuracion',
  imports: [FormsModule, Icono, EstadoVacio, ImportadorExcel, HhmmPipe],
  templateUrl: './configuracion.html',
})
export class Configuracion implements OnInit {
  private readonly datos = inject(NominaDatos);
  private readonly avisos = inject(Avisos);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  protected readonly plantilla = PLANTILLA_FESTIVOS;
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly vigencias = signal<VigenciaGuardada[]>([]);
  protected readonly festivos = signal<Festivo[]>([]);
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly importando = signal(false);
  protected editandoId: string | null = null;
  protected form!: FormVigencia;
  protected nuevoFestivo = { fecha: '', nombre: '' };

  protected readonly vigenteHoy = computed(() =>
    this.vigencias().length ? vigenciaPara(hoy(), this.vigencias()).id : null,
  );
  protected readonly festivosAnio = computed(() =>
    this.festivos().filter((f) => f.fecha.startsWith(String(this.anio()))),
  );

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      const [vigencias, festivos] = await Promise.all([this.datos.vigencias(), this.datos.festivos()]);
      this.vigencias.set(vigencias);
      this.festivos.set(festivos);
    } catch (e) {
      this.avisos.error((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Vigencias ───
  protected abrir(v?: VigenciaGuardada): void {
    const base = v ?? this.vigencias()[0];
    this.editandoId = v?.id ?? null;
    this.form = base
      ? { ...base, inicioNocturno: aHHmm(base.inicioNocturno), finNocturno: aHHmm(base.finNocturno) }
      : {
          vigenteDesde: hoy(),
          inicioNocturno: '19:00',
          finNocturno: '06:00',
          pctNocturno: 35,
          pctFestivo: 90,
          pctExtraDiurna: 25,
          pctExtraNocturna: 75,
          horasSemanales: 42,
          jornadaDiariaHoras: 8,
          inicioSemana: 1,
        };
    if (!v) this.form.vigenteDesde = hoy();
    this.dialogo().nativeElement.showModal();
  }

  protected cerrarDialogo(): void {
    this.dialogo().nativeElement.close();
  }

  protected async guardarVigencia(): Promise<void> {
    const inicio = aMinutos(this.form.inicioNocturno);
    const fin = aMinutos(this.form.finNocturno);
    if (inicio === null || fin === null || inicio === fin) {
      this.avisos.error('Revisa el horario nocturno: inicio y fin deben ser horas distintas.');
      return;
    }
    this.guardando.set(true);
    try {
      await this.datos.guardarVigencia(
        { ...this.form, inicioNocturno: inicio, finNocturno: fin, inicioSemana: Number(this.form.inicioSemana) },
        this.editandoId ?? undefined,
      );
      this.avisos.exito('Recargos guardados.');
      this.cerrarDialogo();
      await this.cargar();
    } catch (e) {
      this.avisos.error((e as Error).message);
    } finally {
      this.guardando.set(false);
    }
  }

  protected async eliminarVigencia(v: VigenciaGuardada): Promise<void> {
    if (this.vigencias().length === 1) {
      this.avisos.error('Debe quedar al menos una vigencia de recargos.');
      return;
    }
    if (!confirm(`¿Eliminar la vigencia desde ${v.vigenteDesde}?`)) return;
    try {
      await this.datos.eliminarVigencia(v.id);
      this.avisos.exito('Vigencia eliminada.');
      await this.cargar();
    } catch (e) {
      this.avisos.error((e as Error).message);
    }
  }

  // ─── Festivos ───
  protected cambiarAnio(delta: number): void {
    this.anio.update((a) => a + delta);
  }

  protected async generarAnio(): Promise<void> {
    try {
      const lista = generarFestivos(this.anio()).map((f) => ({ ...f, origen: 'generado' as const }));
      await this.datos.guardarFestivos(lista, false);
      this.avisos.exito(`Festivos de ${this.anio()} generados.`);
      await this.cargar();
    } catch (e) {
      this.avisos.error((e as Error).message);
    }
  }

  protected async agregarFestivo(): Promise<void> {
    if (!this.nuevoFestivo.fecha || !this.nuevoFestivo.nombre.trim()) return;
    try {
      await this.datos.guardarFestivos(
        [{ fecha: this.nuevoFestivo.fecha, nombre: this.nuevoFestivo.nombre.trim(), origen: 'manual' }],
        true,
      );
      this.avisos.exito('Festivo guardado.');
      this.nuevoFestivo = { fecha: '', nombre: '' };
      await this.cargar();
    } catch (e) {
      this.avisos.error((e as Error).message);
    }
  }

  protected async eliminarFestivo(f: Festivo): Promise<void> {
    if (!confirm(`¿Quitar ${f.nombre} (${f.fecha}) de los festivos?`)) return;
    try {
      await this.datos.eliminarFestivo(f.fecha);
      this.avisos.exito('Festivo eliminado.');
      await this.cargar();
    } catch (e) {
      this.avisos.error((e as Error).message);
    }
  }

  protected nombreDia(fecha: string): string {
    return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  protected descargarPlantilla(): void {
    void descargarPlantilla(this.plantilla);
  }

  protected readonly analizar = (filas: FilaLeida[]): Analisis<Festivo> => {
    const existentes = new Set(this.festivos().map((f) => f.fecha));
    const vistos = new Set<string>();
    const r: Analisis<Festivo> = { nuevos: [], duplicados: [], errores: [] };
    for (const { fila, valores: v } of filas) {
      const fecha = String(v['fecha']);
      if (vistos.has(fecha)) {
        r.errores.push({ fila, columna: 'Fecha', valor: fecha, mensaje: 'Fecha repetida en el archivo.' });
        continue;
      }
      vistos.add(fecha);
      const festivo: Festivo = { fecha, nombre: String(v['nombre']), origen: 'manual' };
      (existentes.has(fecha) ? r.duplicados : r.nuevos).push(festivo);
    }
    return r;
  };

  protected readonly guardarImportacion = async (
    nuevos: unknown[],
    duplicados: unknown[],
    actualizar: boolean,
  ): Promise<void> => {
    const lista = [...nuevos, ...(actualizar ? duplicados : [])] as Festivo[];
    if (lista.length) await this.datos.guardarFestivos(lista, actualizar);
  };

  protected async finImportacion(importado: boolean): Promise<void> {
    this.importando.set(false);
    if (importado) await this.cargar();
  }
}
