import { TipoHora } from './dominio/particion-horas';

export const NOMBRE_TIPO: Record<TipoHora, string> = {
  ordinaria: 'Ordinarias',
  nocturna: 'Nocturnas',
  festiva: 'Dominical / festiva',
  nocturnaFestiva: 'Nocturna festiva',
};

/** Clases de fondo pastel por tipo de hora (con texto negro). */
export const COLOR_TIPO: Record<TipoHora, string> = {
  ordinaria: 'bg-azul',
  nocturna: 'bg-morado',
  festiva: 'bg-rosado',
  nocturnaFestiva: 'bg-[#b8a3e0]',
};
