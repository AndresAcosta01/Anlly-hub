import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../core/auth';
import { AvisosHost } from '../shared/ui/avisos';
import { Icono, NombreIcono } from '../shared/ui/icono';

interface Enlace {
  ruta: string;
  texto: string;
  icono: NombreIcono;
  soloAdmin: boolean;
}

const ENLACES: Enlace[] = [
  { ruta: '/', texto: 'Inicio', icono: 'inicio', soloAdmin: false },
  { ruta: '/nomina', texto: 'Nómina', icono: 'dinero', soloAdmin: true },
  { ruta: '/horarios', texto: 'Horarios', icono: 'reloj', soloAdmin: true },
  { ruta: '/usuarios', texto: 'Usuarios', icono: 'usuarios', soloAdmin: true },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono, AvisosHost],
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly menuAbierto = signal(false);
  protected readonly enlaces = computed(() =>
    ENLACES.filter((e) => !e.soloAdmin || this.auth.esAdmin()),
  );
  protected readonly iniciales = computed(() => {
    const p = this.auth.perfil();
    const base = p?.nombre || p?.correo || '?';
    return base
      .split(/[\s@.]+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('');
  });

  protected async salir(): Promise<void> {
    await this.auth.cerrarSesion();
    await this.router.navigateByUrl('/login');
  }
}
