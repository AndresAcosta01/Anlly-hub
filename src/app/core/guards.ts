import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

export const sesionGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  await auth.listo;
  return auth.sesion() ? true : inject(Router).createUrlTree(['/login']);
};

export const invitadoGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  await auth.listo;
  return auth.sesion() ? inject(Router).createUrlTree(['/']) : true;
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  await auth.listo;
  return auth.esAdmin() ? true : inject(Router).createUrlTree(['/']);
};
