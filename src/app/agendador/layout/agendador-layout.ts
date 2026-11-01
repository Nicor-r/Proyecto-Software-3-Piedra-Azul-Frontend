import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/services/auth';

interface MenuItem {
  etiqueta: string;
  ruta?: string;
  icono: 'resumen' | 'citas' | 'medicos' | 'pacientes' | 'historial' | 'exportar';
}

@Component({
  selector: 'app-agendador-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './agendador-layout.html',
  styleUrl: './agendador-layout.css',
})
export class AgendadorLayout {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly menu: MenuItem[] = [
    { etiqueta: 'Resumen', icono: 'resumen' },
    { etiqueta: 'Citas por medico', ruta: '/agendador/citas', icono: 'citas' },
    { etiqueta: 'Historial de pacientes', ruta: '/agendador/historial', icono: 'historial' },
    { etiqueta: 'Exportar citas', ruta: '/agendador/exportar', icono: 'exportar' },
    { etiqueta: 'Médicos y terapistas', icono: 'medicos' },
    { etiqueta: 'Pacientes', icono: 'pacientes' },
  ];

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
