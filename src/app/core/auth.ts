import { Injectable, computed, inject, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { Supabase, mensajeError } from './supabase';

export type Rol = 'admin' | 'supervisor';

export interface Perfil {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly supabase = inject(Supabase).cliente;

  readonly sesion = signal<Session | null>(null);
  readonly perfil = signal<Perfil | null>(null);
  readonly esAdmin = computed(() => this.perfil()?.rol === 'admin');
  /** Se resuelve cuando ya se sabe si hay sesión y cuál es el perfil. */
  readonly listo: Promise<void>;

  constructor() {
    this.listo = this.cargar();
    this.supabase.auth.onAuthStateChange((_evento, sesion) => {
      this.sesion.set(sesion);
      if (!sesion) this.perfil.set(null);
    });
  }

  private async cargar(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this.sesion.set(data.session);
    if (data.session) await this.cargarPerfil(data.session.user.id);
  }

  private async cargarPerfil(id: string): Promise<void> {
    const { data } = await this.supabase
      .from('perfiles')
      .select('id, nombre, correo, rol')
      .eq('id', id)
      .single();
    this.perfil.set(data as Perfil | null);
  }

  /** Devuelve un mensaje de error o null si entró. */
  async iniciarSesion(correo: string, clave: string): Promise<string | null> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email: correo, password: clave });
    if (error) return mensajeError(error);
    this.sesion.set(data.session);
    await this.cargarPerfil(data.user.id);
    return null;
  }

  async cerrarSesion(): Promise<void> {
    await this.supabase.auth.signOut();
    this.sesion.set(null);
    this.perfil.set(null);
  }
}
