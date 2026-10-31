import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../../core/services/citas';
import { Auth } from '../../../core/services/auth';
import { TerapistaService } from '../../../core/services/terapista';

@Component({
    selector: 'app-exportar-terapista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './exportar-terapista.html',
    styleUrl: './exportar-terapista.css'
})
export class ExportarTerapista {
    private readonly citasService = inject(CitasService);
    private readonly auth = inject(Auth);
    private readonly terapistaService = inject(TerapistaService);

    fechaExportar = '';
    estadoExportar = 'TODOS';
    exportando = signal(false);

    
    // Obtenemos el nombre para mostrarlo en el input deshabilitado
    get nombreTerapista(): string {
        return `${this.terapistaService.nombreReal()} - ${this.terapistaService.especialidadReal()}`;
    }

    descargarCSV(): void {
        if (!this.fechaExportar) return;

        this.exportando.set(true);
        this.citasService.exportarCitasCSV(this.fechaExportar).subscribe({
            next: (blob) => {
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
                alert('Hubo un error al descargar el CSV');
                this.exportando.set(false);
            }
        });
    }
}