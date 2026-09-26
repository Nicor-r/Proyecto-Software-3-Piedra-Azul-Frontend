import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CitasService, Cita } from '../../core/services/citas';

@Component({
  selector: 'app-mis-citas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mis-citas.html',
  styleUrl: './mis-citas.css',
})
export class MisCitas implements OnInit {

  private readonly citasService = inject(CitasService);

  citas = signal<Cita[]>([]);
  cargando = signal(true);
  mensajeError = signal('');

  ngOnInit(): void {
    this.cargarCitas();
  }

  cargarCitas(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    this.citasService.obtenerMisCitas().subscribe({
      next: (citas) => {
        const ordenadas = [...citas].sort((a, b) => {
          const fechaA = `${a.fecha}T${a.hora}`;
          const fechaB = `${b.fecha}T${b.hora}`;
          return fechaB.localeCompare(fechaA);
        });
        this.citas.set(ordenadas);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al cargar citas:', error);
        this.mensajeError.set(
          error.error?.message ?? 'No se pudieron cargar tus citas'
        );
        this.cargando.set(false);
      }
    });
  }

  formatearHora(hora: string): string {
    const [h, m] = hora.split(':');
    const horaNum = parseInt(h, 10);
    const ampm = horaNum >= 12 ? 'p. m.' : 'a. m.';
    const hora12 = horaNum % 12 === 0 ? 12 : horaNum % 12;
    return `${hora12}:${m} ${ampm}`;
  }

  formatearFecha(fecha: string): string {
    const [y, m, d] = fecha.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}