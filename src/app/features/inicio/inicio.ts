import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../core/auth';
import { EstadoVacio } from '../../shared/ui/estado-vacio';
import { Icono, NombreIcono } from '../../shared/ui/icono';

interface Herramienta {
  ruta: string;
  titulo: string;
  texto: string;
  icono: NombreIcono;
  fondo: string;
  soloAdmin: boolean;
  proximamente?: boolean;
}

const HERRAMIENTAS: Herramienta[] = [
  {
    ruta: '/nomina',
    titulo: 'Nómina',
    texto: 'Horas trabajadas, recargos nocturnos, dominicales, festivos y horas extra.',
    icono: 'dinero',
    fondo: 'bg-azul',
    soloAdmin: true,
  },
  {
    ruta: '/horarios',
    titulo: 'Horarios',
    texto: 'Descansos y almuerzos que respetan la cobertura de cada intervalo.',
    icono: 'reloj',
    fondo: 'bg-morado',
    soloAdmin: true,
    proximamente: true,
  },
  {
    ruta: '/usuarios',
    titulo: 'Usuarios',
    texto: 'Quién entra a Anlly Hub y con qué rol.',
    icono: 'usuarios',
    fondo: 'bg-rosado',
    soloAdmin: true,
  },
];

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, Icono, EstadoVacio],
  template: `
    <section class="degradado-hub aparecer relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10">
      <div class="absolute -top-20 -right-16 size-72 rounded-full bg-white/30 blur-2xl"></div>
      <div class="relative">
        <p class="text-sm font-semibold">{{ saludo() }},</p>
        <h1 class="text-3xl font-extrabold sm:text-4xl">{{ nombre() }}</h1>
        <p class="mt-2 max-w-xl text-negro/80">¿Qué quieres hacer hoy? Elige una herramienta para empezar.</p>
      </div>
    </section>

    @if (herramientas().length) {
      <div class="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        @for (h of herramientas(); track h.ruta) {
          <a
            [routerLink]="h.ruta"
            class="tarjeta aparecer group flex flex-col gap-4 p-6 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div class="flex items-start justify-between">
              <span class="{{ h.fondo }} grid size-14 place-items-center rounded-2xl transition group-hover:scale-105">
                <app-icono [nombre]="h.icono" [tamano]="26" />
              </span>
              @if (h.proximamente) {
                <span class="chip bg-alerta">Próximamente</span>
              }
            </div>
            <div>
              <h2 class="text-xl font-extrabold">{{ h.titulo }}</h2>
              <p class="mt-1 text-sm text-gris">{{ h.texto }}</p>
            </div>
            <span class="mt-auto text-sm font-bold text-morado-fuerte">Abrir →</span>
          </a>
        }
      </div>
    } @else {
      <section class="tarjeta mt-8">
        <app-estado-vacio
          icono="brillo"
          titulo="Pronto tendrás herramientas aquí"
          texto="Estamos preparando las herramientas para supervisores. Te avisaremos cuando estén listas."
        />
      </section>
    }
  `,
})
export class Inicio {
  private readonly auth = inject(Auth);

  protected readonly herramientas = computed(() =>
    HERRAMIENTAS.filter((h) => !h.soloAdmin || this.auth.esAdmin()),
  );
  protected readonly nombre = computed(() => {
    const p = this.auth.perfil();
    return p?.nombre || p?.correo.split('@')[0] || '';
  });
  protected readonly saludo = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  });
}
