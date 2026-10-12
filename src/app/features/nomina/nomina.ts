import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icono, NombreIcono } from '../../shared/ui/icono';

@Component({
  selector: 'app-nomina',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono],
  template: `
    <header class="degradado-hub aparecer relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-10">
      <div class="absolute -top-16 -right-10 size-56 rounded-full bg-white/30 blur-2xl"></div>
      <div class="relative">
        <p class="text-xs font-bold tracking-widest uppercase">Herramienta</p>
        <h1 class="mt-1 flex items-center gap-3 text-3xl font-extrabold sm:text-4xl">
          <app-icono nombre="dinero" [tamano]="32" /> Nómina
        </h1>
        <p class="mt-2 max-w-2xl text-negro/80">
          Registra entradas y salidas; las horas ordinarias, nocturnas, festivas y extra se calculan solas.
        </p>
      </div>
      <nav class="relative mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Secciones de nómina">
        @for (tab of tabs; track tab.ruta) {
          <a
            [routerLink]="tab.ruta"
            routerLinkActive="!bg-negro !text-white"
            class="flex shrink-0 items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white"
          >
            <app-icono [nombre]="tab.icono" [tamano]="16" /> {{ tab.texto }}
          </a>
        }
      </nav>
    </header>

    <div class="mt-8">
      <router-outlet />
    </div>
  `,
})
export class Nomina {
  protected readonly tabs: { ruta: string; texto: string; icono: NombreIcono }[] = [
    { ruta: 'resumen', texto: 'Resumen', icono: 'grafica' },
    { ruta: 'registro', texto: 'Registro de horas', icono: 'reloj' },
    { ruta: 'agentes', texto: 'Agentes', icono: 'usuarios' },
    { ruta: 'configuracion', texto: 'Configuración', icono: 'ajustes' },
  ];
}
