import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ArchivoDescargado, MedicoService } from '../../core/services/medico';
import { leerMensajeDeError } from '../leer-mensaje-error';

/** Mensajes que se muestran en esta pantalla (HU-4). */
export const MENSAJES_EXPORTAR = {
  filtroIncompleto: 'Debe seleccionar un médico/terapista y una fecha para exportar',
  errorGeneral: 'Ocurrió un error al exportar las citas. Intenta de nuevo.',
} as const;

/** Opciones del filtro de estado (HU-4.1), iguales a las del Panel Agendador. */
export const ESTADOS_CITA = [
  { valor: 'TODOS', etiqueta: 'Todos los estados' },
  { valor: 'CONFIRMADA', etiqueta: 'Confirmada' },
  { valor: 'PENDIENTE', etiqueta: 'Pendiente' },
  { valor: 'COMPLETADA', etiqueta: 'Completada' },
  { valor: 'CANCELADA', etiqueta: 'Cancelada' },
] as const;

/** HE-04 / HU-4 y HU-4.1: exportar a CSV las citas del médico en una fecha. */
@Component({
  selector: 'app-exportar-medico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './exportar-medico.html',
  styleUrls: ['../estilos-medico.css', './exportar-medico.css'],
})
export class ExportarMedico implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly medicoService = inject(MedicoService);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly mensajes = MENSAJES_EXPORTAR;
  readonly estados = ESTADOS_CITA;

  readonly formulario = this.fb.nonNullable.group({
    fecha: ['', Validators.required],
    estado: ['TODOS'],
  });

  /** El médico no se elige: es quien inició sesión (decisión del equipo). */
  readonly nombreMedico = signal('Tus citas');
  readonly exportando = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  get fecha() {
    return this.formulario.controls.fecha;
  }

  ngOnInit(): void {
    if (!this.esNavegador) {
      return;
    }
    this.medicoService.obtenerPerfil().subscribe({
      next: (perfil) => this.nombreMedico.set(perfil.nombre),
      error: () => this.nombreMedico.set('Tus citas'),
    });
  }

  /** Fecha en rojo solo si el médico intentó exportar sin elegirla. */
  fechaInvalida(): boolean {
    return this.fecha.touched && this.fecha.invalid;
  }

  async exportar(): Promise<void> {
    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.fecha.markAsTouched();

    // HU-4 escenario 3: sin fecha NO se consulta al servidor.
    if (this.fecha.invalid) {
      return;
    }

    const { fecha, estado } = this.formulario.getRawValue();
    this.exportando.set(true);

    try {
      // HU-4 escenario 1 y HU-4.1 escenarios 1 y 2
      const archivo = await firstValueFrom(this.medicoService.exportarCitas(fecha, estado));
      this.descargarArchivo(archivo);
      this.mensajeExito.set(`Se descargó el archivo ${archivo.nombre}`);
    } catch (error) {
      // HU-4 escenarios 2 y 4, HU-4.1 escenario 3: mensaje que envía el backend
      this.mensajeError.set(await leerMensajeDeError(error, this.mensajes.errorGeneral));
    } finally {
      this.exportando.set(false);
    }
  }

  /** Hace que el navegador descargue el archivo con el nombre indicado. */
  descargarArchivo(archivo: ArchivoDescargado): void {
    const url = URL.createObjectURL(archivo.contenido);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = archivo.nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  }
}