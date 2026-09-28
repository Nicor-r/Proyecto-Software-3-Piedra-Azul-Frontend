import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { AgendarCita } from './citas/agendar/agendar';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { MisCitas } from './citas/mis-citas/mis-citas';
import { AdminLayout } from './admin/layout/admin-layout';
import { Configuracion } from './admin/configuracion/configuracion';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'auth/login', component: Login },
  { path: 'auth/register', component: Register },
  {
    path: 'citas/agendar',
    component: AgendarCita,
    canActivate: [authGuard]
  },
  {
    path: 'citas/mis-citas',
    component: MisCitas,
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'configuracion' },
      { path: 'configuracion', component: Configuracion },
    ],
  },
  { path: '**', redirectTo: '' },
];