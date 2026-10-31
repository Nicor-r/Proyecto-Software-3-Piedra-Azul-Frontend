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
import { AgendadorLayout } from './agendador/layout/agendador-layout';
import { CitasAgendador } from './agendador/citas/citas-agendador';
import { TerapistaDashboard } from './features/terapista-dashboard/terapista-dashboard';
import { medicoGuard } from './core/guards/medico.guard';
import { MedicoLayout } from './medico/layout/medico-layout';
import { HistorialMedico } from './medico/historial/historial-medico';
import { ExportarMedico } from './medico/exportar/exportar-medico';


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
  {
    path: 'terapista/dashboard',
    component: TerapistaDashboard,
    canActivate: [authGuard] // Agrega terapistaGuard si lo creaste
  },
  {
    path: 'agendador',
    component: AgendadorLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'citas' },
      { path: 'citas', component: CitasAgendador },
    ],
  },
  {
    path: 'medico',
    component: MedicoLayout,
    canActivate: [medicoGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'historial' },
      { path: 'historial', component: HistorialMedico },
      { path: 'exportar', component: ExportarMedico },
    ],
  },
  { path: '**', redirectTo: '' },
];