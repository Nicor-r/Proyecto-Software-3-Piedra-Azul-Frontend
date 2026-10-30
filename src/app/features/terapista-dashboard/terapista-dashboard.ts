import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService, Cita } from '../../core/services/citas';

@Component({
  selector: 'app-terapista-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './terapista-dashboard.html',
  styleUrl: './terapista-dashboard.css'
})
export class TerapistaDashboard {
  private readonly citasService = inject(CitasService);

  // Variables para Historial
  cedulaBusqueda = '';
  historial = signal<Cita[]>([]);
  buscandoHistorial = signal(false);
  mensajeHistorial = signal('');

  // Variables para Exportar CSV
  fechaExportar = '';
  exportando = signal(false);

  buscarHistorial(): void {
    if (!this.cedulaBusqueda.trim()) return;
    
    this.buscandoHistorial.set(true);
    this.mensajeHistorial.set('');
    
    this.citasService.obtenerHistorialPaciente(this.cedulaBusqueda).subscribe({
      next: (citas) => {
        this.historial.set(citas);
        if (citas.length === 0) this.mensajeHistorial.set('El paciente no tiene citas registradas.');
        this.buscandoHistorial.set(false);
      },
      error: (err) => {
        this.mensajeHistorial.set(err.error?.message || 'Error al buscar paciente.');
        this.historial.set([]);
        this.buscandoHistorial.set(false);
      }
    });
  }

  descargarCSV(): void {
    if (!this.fechaExportar) return;

    this.exportando.set(true);
    this.citasService.exportarCitasCSV(this.fechaExportar).subscribe({
      next: (blob) => {
        // Lógica para descargar el archivo en el navegador
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `citas_${this.fechaExportar}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.exportando.set(false);
      },
      error: (err) => {
        console.error('Error al exportar', err);
        alert('Hubo un error al descargar el CSV');
        this.exportando.set(false);
      }
    });
  }
}