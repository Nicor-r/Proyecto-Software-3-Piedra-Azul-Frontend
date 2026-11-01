import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CitasService, Doctor } from '../../core/services/citas';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-exportar-agendador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exportar-agendador.html',
})
export class ExportarAgendador implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly citasService = inject(CitasService);

  medicos = signal<Doctor[]>([]);
  medicoSeleccionado = '';
  fechaExportar = '';
  exportando = signal(false);

  ngOnInit() {
    this.citasService.obtenerDoctores().subscribe(data => this.medicos.set(data));
  }

  descargarCSV() {
    if (!this.fechaExportar || !this.medicoSeleccionado) return;
    this.exportando.set(true);

    // OJO: Aquí llamamos al endpoint del Agendador
    const url = `${environment.apiUrl}/citas/exportar-agendador?fecha=${this.fechaExportar}&medicoId=${this.medicoSeleccionado}`;
    
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `citas_${this.fechaExportar}.csv`;
        a.click();
        this.exportando.set(false);
      },
      error: () => this.exportando.set(false)
    });
  }
}