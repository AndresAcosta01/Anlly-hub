import { Component } from '@angular/core';
import { Icono } from '../../shared/ui/icono';

@Component({
  selector: 'app-horarios',
  imports: [Icono],
  template: `
    <section class="degradado-hub aparecer relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10">
      <p class="text-xs font-bold tracking-widest uppercase">Herramienta</p>
      <h1 class="mt-1 flex items-center gap-3 text-3xl font-extrabold sm:text-4xl">
        <app-icono nombre="reloj" [tamano]="32" /> Horarios
      </h1>
      <p class="mt-2 max-w-2xl text-negro/80">Asignación de descansos y almuerzos. Estamos construyéndola.</p>
    </section>

    <section class="tarjeta aparecer mt-8 p-6 sm:p-8">
      <span class="chip bg-alerta">Próximamente</span>
      <h2 class="mt-3 text-xl font-extrabold">Lo que vas a poder hacer</h2>
      <ul class="mt-4 grid gap-3 sm:grid-cols-2">
        @for (item of funciones; track item) {
          <li class="flex items-start gap-3 rounded-2xl bg-fondo p-4">
            <span class="text-morado-fuerte"><app-icono nombre="ok" /></span>
            <span>{{ item }}</span>
          </li>
        }
      </ul>
    </section>
  `,
})
export class Horarios {
  protected readonly funciones = [
    'Ingresar los agentes requeridos cada 30 minutos, día por día.',
    'Asignar descansos automáticos a las :05 y :35 sin romper la cobertura.',
    'Respetar almuerzos a hora fija y agentes que salen temprano.',
    'Ver la cobertura por intervalo: Cumple, Revisar o Déficit.',
  ];
}
