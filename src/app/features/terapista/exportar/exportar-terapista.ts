import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CitasService } from '../../../core/services/citas';
import { TerapistaService } from '../../../core/services/terapista';
import { leerMensajeDeError } from '../../../medico/leer-mensaje-error';
import { ESTADOS_CITA } from '../../../medico/exportar/exportar-medico';


export const MENSAJES_EXPORTAR_TERAPISTA = {
  filtroIncompleto: 'Debe seleccionar una fecha para exportar',
  errorGeneral: 'Ocurrió un error al exportar las citas. Intenta de nuevo.',
} as const;


@Component({
  selector: 'app-exportar-terapista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './exportar-terapista.html',
  styleUrls: ['../estilos-terapista.css', './exportar-terapista.css'],
})
export class ExportarTerapista {
  private readonly fb = inject(FormBuilder);
  private readonly citasService = inject(CitasService);
  private readonly terapistaService = inject(TerapistaService);

  readonly mensajes = MENSAJES_EXPORTAR_TERAPISTA;
  readonly estados = ESTADOS_CITA;

  readonly formulario = this.fb.nonNullable.group({
    fecha: ['', Validators.required],
    estado: ['TODOS'],
  });

  readonly exportando = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  get fecha() {
    return this.formulario.controls.fecha;
  }

  /** El terapista no se elige: es quien inició sesión. */
  get nombreTerapista(): string {
    return `${this.terapistaService.nombreReal()} - ${this.terapistaService.especialidadReal()}`;
  }

  /** Fecha en rojo solo si el terapista intentó exportar sin elegirla. */
  fechaInvalida(): boolean {
    return this.fecha.touched && this.fecha.invalid;
  }

  async exportar(): Promise<void> {
    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.fecha.markAsTouched();

    // Sin fecha NO se consulta al servidor
    if (this.fecha.invalid) {
      return;
    }

    const { fecha } = this.formulario.getRawValue();
    const nombreArchivo = `citas_${fecha}.csv`;
    this.exportando.set(true);

    try {
      
      const blob = await firstValueFrom(this.citasService.exportarCitasCSV(fecha));
      this.descargarArchivo(blob, nombreArchivo);
      this.mensajeExito.set(`Se descargó el archivo ${nombreArchivo}`);
    } catch (error) {
      this.mensajeError.set(await leerMensajeDeError(error, this.mensajes.errorGeneral));
    } finally {
      this.exportando.set(false);
    }
  }

  /** Hace que el navegador descargue el archivo con el nombre indicado. */
  private descargarArchivo(contenido: Blob, nombre: string): void {
    const url = URL.createObjectURL(contenido);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  }
}