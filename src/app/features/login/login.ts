import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/auth';
import { Icono } from '../../shared/ui/icono';

@Component({
  selector: 'app-login',
  imports: [FormsModule, Icono],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected correo = '';
  protected clave = '';
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async entrar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    const error = await this.auth.iniciarSesion(this.correo.trim(), this.clave);
    this.cargando.set(false);
    if (error) this.error.set(error);
    else await this.router.navigateByUrl('/');
  }
}
