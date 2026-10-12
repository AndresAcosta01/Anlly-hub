import { Routes } from '@angular/router';
import { Nomina } from './nomina';

export const nominaRoutes: Routes = [
  {
    path: '',
    component: Nomina,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'resumen' },
      {
        path: 'resumen',
        title: 'Resumen · Nómina',
        loadComponent: () => import('./paginas/resumen/resumen').then((m) => m.Resumen),
      },
      {
        path: 'registro',
        title: 'Registro de horas · Nómina',
        loadComponent: () =>
          import('./paginas/registro-horas/registro-horas').then((m) => m.RegistroHoras),
      },
      {
        path: 'agentes',
        title: 'Agentes · Nómina',
        loadComponent: () => import('./paginas/agentes/agentes').then((m) => m.Agentes),
      },
      {
        path: 'configuracion',
        title: 'Configuración · Nómina',
        loadComponent: () =>
          import('./paginas/configuracion/configuracion').then((m) => m.Configuracion),
      },
    ],
  },
];
