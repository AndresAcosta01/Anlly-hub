import { Component, Injectable, inject, signal } from '@angular/core';
import { Icono } from './icono';

export interface Aviso {
  id: number;
  tipo: 'exito' | 'error';
  texto: string;
}

@Injectable({ providedIn: 'root' })
export class Avisos {
  readonly lista = signal<Aviso[]>([]);
  private siguiente = 0;

  exito(texto: string): void {
    this.mostrar('exito', texto);
  }

  error(texto: string): void {
    this.mostrar('error', texto);
  }

  cerrar(id: number): void {
    this.lista.update((l) => l.filter((a) => a.id !== id));
  }

  private mostrar(tipo: Aviso['tipo'], texto: string): void {
    const id = this.siguiente++;
    this.lista.update((l) => [...l, { id, tipo, texto }]);
    setTimeout(() => this.cerrar(id), tipo === 'error' ? 7000 : 4000);
  }
}

@Component({
  selector: 'app-avisos',
  imports: [Icono],
  template: `
    <div class="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      @for (aviso of avisos.lista(); track aviso.id) {
        <div
          class="aparecer flex items-start gap-3 rounded-2xl border border-borde p-4 text-sm font-medium text-negro shadow-suave"
          [class.bg-exito]="aviso.tipo === 'exito'"
          [class.bg-error]="aviso.tipo === 'error'"
          role="status"
        >
          <app-icono [nombre]="aviso.tipo === 'exito' ? 'ok' : 'error'" />
          <p class="flex-1">{{ aviso.texto }}</p>
          <button type="button" class="rounded-lg p-0.5 hover:bg-white/50" (click)="avisos.cerrar(aviso.id)" aria-label="Cerrar aviso">
            <app-icono nombre="cerrar" [tamano]="16" />
          </button>
        </div>
      }
    </div>
  `,
})
export class AvisosHost {
  protected readonly avisos = inject(Avisos);
}
