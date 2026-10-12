import { Component, input } from '@angular/core';
import { Icono, NombreIcono } from './icono';

@Component({
  selector: 'app-estado-vacio',
  imports: [Icono],
  template: `
    <div class="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span class="degradado-hub grid size-16 place-items-center rounded-3xl">
        <app-icono [nombre]="icono()" [tamano]="28" />
      </span>
      <h3 class="text-lg font-extrabold">{{ titulo() }}</h3>
      <p class="max-w-md text-sm text-gris">{{ texto() }}</p>
      <div class="mt-2 flex flex-wrap justify-center gap-2"><ng-content /></div>
    </div>
  `,
})
export class EstadoVacio {
  readonly icono = input<NombreIcono>('brillo');
  readonly titulo = input.required<string>();
  readonly texto = input('');
}
