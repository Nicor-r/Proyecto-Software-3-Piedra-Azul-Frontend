import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { MedicoService } from '../../core/services/medico';

interface ItemMenu {
  etiqueta: string;
  ruta: string;
  icono: 'historial' | 'exportar';
}

/**
 * Panel del actor MEDICO (HE-04 y HE-05): barra lateral, encabezado con el
 * nombre real del medico (GET /api/medico/perfil) y area de contenido.
 */
@Component({
  selector: 'app-medico-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './medico-layout.html',
  styleUrl: './medico-layout.css',
})
export class MedicoLayout implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly medicoService = inject(MedicoService);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly menu: ItemMenu[] = [
    { etiqueta: 'Historial de pacientes', ruta: '/medico/historial', icono: 'historial' },
    { etiqueta: 'Exportar citas', ruta: '/medico/exportar', icono: 'exportar' },
  ];

  /** Nombre completo de la ficha, ej. "Dra. Ibis González - Cardiología". */
  readonly nombreMedico = signal('Médico');

  /** "Dra. Ibis González" (sin la especialidad). */
  readonly nombreCorto = computed(() => this.nombreMedico().split(' - ')[0]);

  /** "Cardiología", o "Médico" si la ficha no trae especialidad. */
  readonly especialidad = computed(() => this.nombreMedico().split(' - ')[1] ?? 'Médico');

  /** "IG" para el avatar circular. */
  readonly iniciales = computed(() => calcularIniciales(this.nombreMedico()));

  ngOnInit(): void {
    // En el servidor (SSR) no hay token: solo pedimos el perfil en el navegador.
    if (!this.esNavegador) {
      return;
    }
    this.medicoService.obtenerPerfil().subscribe({
      next: (perfil) => this.nombreMedico.set(perfil.nombre),
      error: () => this.nombreMedico.set('Médico'),
    });
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}

/** "Dra. Ibis González - Cardiología" -> "IG". Sin nombre -> "MD". */
export function calcularIniciales(nombre: string): string {
  const sinEspecialidad = nombre.split(' - ')[0];
  const sinTitulo = sinEspecialidad.replace(/^Dra?\.\s*/i, '').trim();
  const iniciales = sinTitulo
    .split(/\s+/)
    .filter((palabra) => palabra.length > 0)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join('');
  return iniciales || 'MD';
}