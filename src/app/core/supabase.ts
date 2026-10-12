import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Supabase {
  readonly cliente = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
}

/** Traduce los errores más comunes de Supabase/Postgres a mensajes para el usuario. */
export function mensajeError(error: { message?: string; code?: string } | null): string {
  if (!error) return 'Ocurrió un error inesperado.';
  if (error.code === '23505') return 'Ya existe un registro con ese dato único.';
  if (error.code === '23503') return 'El registro está relacionado con otros datos.';
  if (error.code === '42501') return 'No tienes permiso para esta acción.';
  if (error.message === 'Invalid login credentials') return 'Correo o contraseña incorrectos.';
  if (error.message?.includes('Failed to fetch')) return 'No hay conexión con el servidor.';
  return error.message ?? 'Ocurrió un error inesperado.';
}
