import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { AgendarCita } from './citas/agendar/agendar';
import { authGuard } from './core/guards/auth.guard';
import { MisCitas } from './citas/mis-citas/mis-citas';
import { gestionar } from './citas/gestionar/gestionar';

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
    path: 'admin/citas',
    component: gestionar
  },
  { path: '**', redirectTo: '' },
];