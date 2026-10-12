import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Avisos } from '../ui/avisos';
import { Icono } from '../ui/icono';
import { ErrorFila, FilaLeida, Plantilla, descargarErrores, descargarPlantilla, leerExcel } from './excel';

/** Resultado de validar las filas contra los datos del negocio. */
export interface Analisis<T = unknown> {
  nuevos: T[];
  duplicados: T[];
  errores: ErrorFila[];
}

type Paso = 'elegir' | 'leyendo' | 'revision' | 'guardando';

@Component({
  selector: 'app-importador-excel',
  imports: [Icono],
  templateUrl: './importador-excel.html',
})
export class ImportadorExcel {
  private readonly avisos = inject(Avisos);

  readonly plantilla = input.required<Plantilla>();
  readonly analizar = input.required<(filas: FilaLeida[]) => Analisis | Promise<Analisis>>();
  readonly guardar =
    input.required<(nuevos: unknown[], duplicados: unknown[], actualizar: boolean) => Promise<void>>();
  readonly cerrar = output<boolean>();

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  protected readonly paso = signal<Paso>('elegir');
  protected readonly error = signal<string | null>(null);
  protected readonly arrastrando = signal(false);
  protected readonly analisis = signal<Analisis | null>(null);
  protected readonly actualizar = signal(false);
  protected readonly aImportar = computed(() => {
    const a = this.analisis();
    return a ? a.nuevos.length + (this.actualizar() ? a.duplicados.length : 0) : 0;
  });

  constructor() {
    afterNextRender(() => this.dialogo().nativeElement.showModal());
  }

  protected descargarPlantilla(): void {
    void descargarPlantilla(this.plantilla());
  }

  protected descargarErrores(): void {
    void descargarErrores(this.plantilla(), this.analisis()?.errores ?? []);
  }

  protected soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
    const archivo = evento.dataTransfer?.files[0];
    if (archivo) void this.leer(archivo);
  }

  protected elegir(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const archivo = campo.files?.[0];
    campo.value = '';
    if (archivo) void this.leer(archivo);
  }

  private async leer(archivo: File): Promise<void> {
    this.paso.set('leyendo');
    this.error.set(null);
    try {
      const { filas, errores } = await leerExcel(archivo, this.plantilla());
      const a = await this.analizar()(filas);
      const todos = [...errores, ...a.errores].sort((x, y) => x.fila - y.fila);
      this.analisis.set({ ...a, errores: todos });
      this.paso.set('revision');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
      this.paso.set('elegir');
    }
  }

  protected async importar(): Promise<void> {
    const a = this.analisis();
    if (!a) return;
    this.paso.set('guardando');
    try {
      await this.guardar()(a.nuevos, a.duplicados, this.actualizar());
      this.avisos.exito(`Se importaron ${this.aImportar()} registros.`);
      this.terminar(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
      this.paso.set('revision');
    }
  }

  protected reiniciar(): void {
    this.analisis.set(null);
    this.error.set(null);
    this.paso.set('elegir');
  }

  protected terminar(importado = false): void {
    this.dialogo().nativeElement.close();
    this.cerrar.emit(importado);
  }
}
