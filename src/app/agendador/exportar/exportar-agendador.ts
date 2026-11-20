import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CitasService, Doctor } from '../../core/services/citas';
import { environment } from '../../../environments/environment';
import { leerMensajeDeError } from '../../medico/leer-mensaje-error';

export const MENSAJES_EXPORTAR_AGENDADOR = {
  medicoVacio: 'Debe seleccionar un médico o terapista',
  fechaVacia: 'Debe seleccionar una fecha para exportar',
  errorGeneral: 'Ocurrió un error al exportar las citas. Intenta de nuevo.',
} as const;

/** Exportar a CSV las citas de un médico/terapista en una fecha (mismo diseño que el panel Médico). */
@Component({
  selector: 'app-exportar-agendador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './exportar-agendador.html',
  styleUrls: ['../estilos-agendador.css', './exportar-agendador.css'],
})
export class ExportarAgendador implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly citasService = inject(CitasService);

  readonly mensajes = MENSAJES_EXPORTAR_AGENDADOR;

  readonly formulario = this.fb.nonNullable.group({
    medicoId: ['', Validators.required],
    fecha: ['', Validators.required],
  });

  readonly medicos = signal<Doctor[]>([]);
  readonly exportando = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  ngOnInit(): void {
    this.citasService.obtenerDoctores().subscribe({
      next: (data) => this.medicos.set(data),
      error: () => this.mensajeError.set('No se pudo cargar la lista de profesionales.'),
    });
  }

  /** Campo en rojo solo si el agendador intentó exportar sin llenarlo. */
  campoInvalido(campo: 'medicoId' | 'fecha'): boolean {
    const control = this.formulario.controls[campo];
    return control.touched && control.invalid;
  }

  async exportar(): Promise<void> {
    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.formulario.markAllAsTouched();

    // Sin médico o sin fecha NO se consulta al servidor
    if (this.formulario.invalid) {
      return;
    }

    const { medicoId, fecha } = this.formulario.getRawValue();
    const nombreArchivo = `citas_${medicoId}_${fecha}.csv`;
    const params = new HttpParams().set('fecha', fecha).set('medicoId', medicoId);
    this.exportando.set(true);

    try {
      // Mismo endpoint que ya usaba esta pantalla
      const blob = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/citas/exportar-agendador`, { params, responseType: 'blob' })
      );
      this.descargarArchivo(blob, nombreArchivo);
      this.mensajeExito.set(`Se descargó el archivo ${nombreArchivo}`);
    } catch (error) {
      this.mensajeError.set(await leerMensajeDeError(error, this.mensajes.errorGeneral));
    } finally {
      this.exportando.set(false);
    }
  }

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