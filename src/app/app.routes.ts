import { Routes } from '@angular/router';
import { adminGuard, invitadoGuard, sesionGuard } from './core/guards';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar · Anlly Hub',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Shell,
    canActivate: [sesionGuard],
    children: [
      {
        path: '',
        title: 'Inicio · Anlly Hub',
        loadComponent: () => import('./features/inicio/inicio').then((m) => m.Inicio),
      },
      {
        path: 'nomina',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/nomina/nomina.routes').then((m) => m.nominaRoutes),
      },
      {
        path: 'horarios',
        title: 'Horarios · Anlly Hub',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/horarios/horarios').then((m) => m.Horarios),
      },
      {
        path: 'usuarios',
        title: 'Usuarios · Anlly Hub',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/usuarios/usuarios').then((m) => m.Usuarios),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
