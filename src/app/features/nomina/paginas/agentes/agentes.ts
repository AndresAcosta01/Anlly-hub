import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ErrorFila, FilaLeida, descargarPlantilla } from '../../../../shared/excel/excel';
import { Analisis, ImportadorExcel } from '../../../../shared/excel/importador-excel';
import { Avisos } from '../../../../shared/ui/avisos';
import { EstadoVacio } from '../../../../shared/ui/estado-vacio';
import { Icono } from '../../../../shared/ui/icono';
import { Agente, NominaDatos, NuevoAgente, VigenciaGuardada } from '../../datos/nomina-datos';
import { valorHora } from '../../dominio/liquidacion';
import { hoy } from '../../dominio/tiempo';
import { vigenciaPara } from '../../dominio/vigencias';
import { PesosPipe } from '../../pipes';
import { PLANTILLA_AGENTES } from '../../plantillas';

const VACIO: NuevoAgente = {
  documento: '',
  nombre: '',
  salarioBase: null,
  valorHora: null,
  jornadaDiariaHoras: null,
  activo: true,
};

@Component({
  selector: 'app-agentes',
  imports: [FormsModule, Icono, EstadoVacio, ImportadorExcel, PesosPipe],
  templateUrl: './agentes.html',
})
export class Agentes implements OnInit {
  private readonly datos = inject(NominaDatos);
  private readonly avisos = inject(Avisos);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  protected readonly plantilla = PLANTILLA_AGENTES;
  protected readonly cargando = signal(true);
  protected readonly agentes = signal<Agente[]>([]);
  protected readonly vigencias = signal<VigenciaGuardada[]>([]);
  protected readonly busqueda = signal('');
  protected readonly importando = signal(false);
  protected readonly guardando = signal(false);
  protected editandoId: string | null = null;
  protected form: NuevoAgente = { ...VACIO };

  protected readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.agentes().filter(
      (a) => !q || a.nombre.toLowerCase().includes(q) || a.documento.includes(q),
    );
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      const [agentes, vigencias] = await Promise.all([this.datos.agentes(), this.datos.vigencias()]);
      this.agentes.set(agentes);
      this.vigencias.set(vigencias);
    } catch (e) {
      this.avisos.error((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  protected valorHora(a: Agente): number | null {
    if (!this.vigencias().length) return a.valorHora;
    return valorHora(a, vigenciaPara(hoy(), this.vigencias())) || null;
  }

  protected abrir(agente?: Agente): void {
    this.editandoId = agente?.id ?? null;
    this.form = agente ? { ...agente } : { ...VACIO };
    this.dialogo().nativeElement.showModal();
  }

  protected cerrarDialogo(): void {
    this.dialogo().nativeElement.close();
  }

  protected async guardar(): Promise<void> {
    this.guardando.set(true);
    try {
      await this.datos.guardarAgente(
        { ...this.form, documento: this.form.documento.trim(), nombre: this.form.nombre.trim() },
        this.editandoId ?? undefined,
      );
      this.avisos.exito(this.editandoId ? 'Agente actualizado.' : 'Agente agregado.');
      this.cerrarDialogo();
      await this.cargar();
    } catch (e) {
      this.avisos.error((e as Error).message);
    } finally {
      this.guardando.set(false);
    }
  }

  protected async eliminar(a: Agente): Promise<void> {
    if (!confirm(`¿Eliminar a ${a.nombre}? También se borrarán sus registros de horas.`)) return;
    try {
      await this.datos.eliminarAgente(a.id);
      this.avisos.exito('Agente eliminado.');
      await this.cargar();
    } catch (e) {
      this.avisos.error((e as Error).message);
    }
  }

  protected descargarPlantilla(): void {
    void descargarPlantilla(this.plantilla);
  }

  // ─── Importación ───
  protected readonly analizar = (filas: FilaLeida[]): Analisis<NuevoAgente> => {
    const existentes = new Set(this.agentes().map((a) => a.documento));
    const vistos = new Map<string, number>();
    const r: Analisis<NuevoAgente> = { nuevos: [], duplicados: [], errores: [] };
    const error = (fila: number, columna: string, valor: string, mensaje: string): ErrorFila => ({ fila, columna, valor, mensaje });

    for (const { fila, valores: v } of filas) {
      const documento = String(v['documento']);
      if (vistos.has(documento)) {
        r.errores.push(error(fila, 'Documento', documento, `Repetido en el archivo (fila ${vistos.get(documento)}).`));
        continue;
      }
      vistos.set(documento, fila);
      const jornada = v['jornadaDiaria'] as number | null;
      if (jornada !== null && (jornada <= 0 || jornada > 24)) {
        r.errores.push(error(fila, 'Jornada diaria', String(jornada), 'Debe estar entre 1 y 24 horas.'));
        continue;
      }
      const agente: NuevoAgente = {
        documento,
        nombre: String(v['nombre']),
        salarioBase: v['salarioBase'] as number | null,
        valorHora: v['valorHora'] as number | null,
        jornadaDiariaHoras: jornada,
        activo: (v['activo'] as boolean | null) ?? true,
      };
      (existentes.has(documento) ? r.duplicados : r.nuevos).push(agente);
    }
    return r;
  };

  protected readonly guardarImportacion = async (
    nuevos: unknown[],
    duplicados: unknown[],
    actualizar: boolean,
  ): Promise<void> => {
    const lista = [...nuevos, ...(actualizar ? duplicados : [])] as NuevoAgente[];
    if (lista.length) await this.datos.importarAgentes(lista, actualizar);
  };

  protected async finImportacion(importado: boolean): Promise<void> {
    this.importando.set(false);
    if (importado) await this.cargar();
  }
}
