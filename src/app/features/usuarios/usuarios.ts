import { Component, OnInit, inject, signal } from '@angular/core';
import { Auth, Perfil, Rol } from '../../core/auth';
import { Supabase, mensajeError } from '../../core/supabase';
import { Avisos } from '../../shared/ui/avisos';
import { Icono } from '../../shared/ui/icono';

@Component({
  selector: 'app-usuarios',
  imports: [Icono],
  templateUrl: './usuarios.html',
})
export class Usuarios implements OnInit {
  private readonly db = inject(Supabase).cliente;
  private readonly avisos = inject(Avisos);
  protected readonly auth = inject(Auth);

  protected readonly cargando = signal(true);
  protected readonly perfiles = signal<Perfil[]>([]);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    const { data, error } = await this.db
      .from('perfiles')
      .select('id, nombre, correo, rol')
      .order('correo');
    if (error) this.avisos.error(mensajeError(error));
    else this.perfiles.set(data as Perfil[]);
    this.cargando.set(false);
  }

  protected async actualizar(p: Perfil, cambios: Partial<Pick<Perfil, 'nombre' | 'rol'>>): Promise<void> {
    if (cambios.nombre !== undefined && cambios.nombre.trim() === p.nombre) return;
    const { error } = await this.db.from('perfiles').update(cambios).eq('id', p.id);
    if (error) {
      this.avisos.error(mensajeError(error));
      return;
    }
    this.avisos.exito('Usuario actualizado.');
    await this.cargar();
  }

  protected cambiarRol(p: Perfil, rol: string): void {
    void this.actualizar(p, { rol: rol as Rol });
  }
}
