import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/services/auth';

interface ItemMenu {
  etiqueta: string;
  ruta?: string;
  icono: 'resumen' | 'configuracion' | 'medicos' | 'citas' | 'reportes';
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  // Solo "Configuración" está implementada en este corte (HE-03). El resto
  // del menú se deja visible para que coincida con el diseño de Figma, pero
  // inactivo hasta que se desarrollen esas historias de usuario.
  menu: ItemMenu[] = [
    { etiqueta: 'Resumen', icono: 'resumen' },
    { etiqueta: 'Configuración', ruta: '/admin/configuracion', icono: 'configuracion' },
    { etiqueta: 'Médicos y terapistas', icono: 'medicos' },
    { etiqueta: 'Citas', icono: 'citas' },
    { etiqueta: 'Reportes', icono: 'reportes' },
  ];

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
