import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import { Cita, CitasService } from '../../../core/services/citas';
import { HistorialPaciente, PacienteSugerencia } from '../../../core/services/medico';
import { claseEstado, formatearFecha, formatearHora, textoEstado } from '../../../medico/formato-cita';
import { leerMensajeDeError } from '../../../medico/leer-mensaje-error';

/** Mensajes mostrados en la vista de historial de pacientes del terapista. */
export const MENSAJES_HISTORIAL = {
  cedulaVacia: 'Debe ingresar el número de cédula',
  formatoInvalido: 'La cédula debe contener solo números, entre 6 y 10 dígitos',
  sinCitas: 'El paciente no tiene citas registradas',
  sinCoincidencias: 'No se encontraron pacientes con esa cédula',
  errorGeneral: 'Ocurrió un error al consultar el historial. Intenta de nuevo.',
} as const;

/** Milisegundos que se espera sin teclas nuevas antes de pedir sugerencias. */
export const ESPERA_SUGERENCIAS_MS = 300;

interface ResultadoSugerencias {
  texto: string;
  sugerencias: PacienteSugerencia[] | null;
}

/** Historial de citas de pacientes por cédula para el panel de terapista. */
@Component({
  selector: 'app-historial-terapista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './historial-terapista.html',
  styleUrls: ['../estilos-terapista.css', './historial-terapista.css'],
})
export class HistorialTerapista {
  private readonly fb = inject(FormBuilder);
  private readonly citasService = inject(CitasService);

  readonly mensajes = MENSAJES_HISTORIAL;

  readonly formulario = this.fb.nonNullable.group({
    cedula: ['', [Validators.required, Validators.pattern(/^\d{6,10}$/)]],
  });

  readonly historial = signal<HistorialPaciente | null>(null);
  readonly cargando = signal(false);
  readonly mensajeError = signal('');

  // Autocompletado
  readonly sugerencias = signal<PacienteSugerencia[]>([]);
  readonly sinCoincidencias = signal(false);
  private readonly textoEscrito$ = new Subject<string>();
  private cedulaBuscada = '';

  // Funciones de formato disponibles para la plantilla
  readonly formatearFecha = formatearFecha;
  readonly formatearHora = formatearHora;
  readonly textoEstado = textoEstado;
  readonly claseEstado = claseEstado;

  constructor() {
    this.textoEscrito$
      .pipe(
        map((texto) => texto.trim()),
        debounceTime(ESPERA_SUGERENCIAS_MS),
        switchMap((texto) => this.pedirSugerencias(texto)),
        takeUntilDestroyed()
      )
      .subscribe((resultado) => this.mostrarSugerencias(resultado));
  }

  get cedula() {
    return this.formulario.controls.cedula;
  }

  /** Se llama en cada tecla del campo cédula. */
  alEscribirCedula(texto: string): void {
    this.cedulaBuscada = '';
    this.textoEscrito$.next(texto);
  }

  /** Completa el campo con la sugerencia seleccionada y consulta su historial. */
  seleccionarSugerencia(sugerencia: PacienteSugerencia): void {
    this.cedula.setValue(sugerencia.cedula);
    this.buscar();
  }

  ocultarSugerencias(): void {
    this.sugerencias.set([]);
    this.sinCoincidencias.set(false);
  }

  /** Mensaje bajo el campo: solo si el usuario ya intentó buscar y el valor es inválido. */
  mensajeCampoCedula(): string {
    if (!this.cedula.touched || this.cedula.valid) {
      return '';
    }
    return this.cedula.hasError('required') ? this.mensajes.cedulaVacia : this.mensajes.formatoInvalido;
  }

  buscar(): void {
    this.mensajeError.set('');
    this.cedula.setValue(this.cedula.value.trim());
    this.cedula.markAsTouched();
    this.cedulaBuscada = this.cedula.value;
    this.ocultarSugerencias();

    if (this.cedula.invalid) {
      this.historial.set(null);
      return;
    }

    const cedulaConsultada = this.cedula.value;
    this.cargando.set(true);
    this.citasService.obtenerHistorialPaciente(cedulaConsultada).subscribe({
      next: (citas: Cita[]) => {
        this.historial.set({
          cedula: cedulaConsultada,
          nombrePaciente: citas[0]?.pacienteNombre ?? '',
          total: citas.length,
          citas,
        });
        this.cargando.set(false);
      },
      error: async (error: HttpErrorResponse) => {
        this.historial.set(null);
        this.cargando.set(false);
        const mensaje = await leerMensajeDeError(error, this.mensajes.errorGeneral);
        this.mensajeError.set(mensaje || this.mensajes.errorGeneral);
      },
    });
  }

  private pedirSugerencias(texto: string): Observable<ResultadoSugerencias> {
    if (!/^\d{3,10}$/.test(texto)) {
      return of({ texto, sugerencias: null });
    }
    return this.citasService.sugerirPacientes(texto).pipe(
      map((sugerencias) => ({ texto, sugerencias })),
      catchError(() => of({ texto, sugerencias: null }))
    );
  }

  private mostrarSugerencias(resultado: ResultadoSugerencias): void {
    if (resultado.texto === this.cedulaBuscada) {
      return;
    }
    if (resultado.sugerencias === null) {
      this.ocultarSugerencias();
      return;
    }
    this.sugerencias.set(resultado.sugerencias);
    this.sinCoincidencias.set(resultado.sugerencias.length === 0);
  }
}
