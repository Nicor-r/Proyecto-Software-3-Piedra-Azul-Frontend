import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import { HistorialPaciente, MedicoService, PacienteSugerencia } from '../../core/services/medico';
import { claseEstado, formatearFecha, formatearHora, textoEstado } from '../formato-cita';

/** Mensajes exactos de HU-5 y HU-5.1 que se muestran en esta pantalla. */
export const MENSAJES_HISTORIAL = {
  cedulaVacia: 'Debe ingresar el número de cédula',
  formatoInvalido: 'La cédula debe contener solo números, entre 6 y 10 dígitos',
  sinCitas: 'El paciente no tiene citas registradas',
  sinCoincidencias: 'No se encontraron pacientes con esa cédula',
  errorGeneral: 'Ocurrió un error al consultar el historial. Intenta de nuevo.',
} as const;

/** Milisegundos que se espera sin teclas nuevas antes de pedir sugerencias. */
export const ESPERA_SUGERENCIAS_MS = 300;

/** Resultado de pedir sugerencias: null = no mostrar nada (menos de 3 dígitos o error). */
interface ResultadoSugerencias {
  texto: string;
  sugerencias: PacienteSugerencia[] | null;
}

/** HE-05 / HU-5 y HU-5.1: historial de citas por cédula con autocompletado. */
@Component({
  selector: 'app-historial-medico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './historial-medico.html',
  styleUrls: ['../estilos-medico.css', './historial-medico.css'],
})
export class HistorialMedico {
  private readonly fb = inject(FormBuilder);
  private readonly medicoService = inject(MedicoService);

  readonly mensajes = MENSAJES_HISTORIAL;

  readonly formulario = this.fb.nonNullable.group({
    cedula: ['', [Validators.required, Validators.pattern(/^\d{6,10}$/)]],
  });

  readonly historial = signal<HistorialPaciente | null>(null);
  readonly cargando = signal(false);
  readonly mensajeError = signal('');

  // Autocompletado (HU-5.1)
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
        // 1. Esperar a que el usuario deje de escribir
        debounceTime(ESPERA_SUGERENCIAS_MS),
        // 2 y 3. Consultar solo con 3 a 10 dígitos, cancelando la consulta anterior
        switchMap((texto) => this.pedirSugerencias(texto)),
        // Deja de escuchar automáticamente cuando se cierra la pantalla
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

  /** HU-5.1 escenario 2: completar el campo con la sugerencia y consultar su historial. */
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

    // HU-5 escenarios 4 y 5: si la cédula es inválida NO se ejecuta la búsqueda.
    if (this.cedula.invalid) {
      this.historial.set(null);
      return;
    }

    this.cargando.set(true);
    this.medicoService.consultarHistorial(this.cedula.value).subscribe({
      next: (historial) => {
        this.historial.set(historial);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        // HU-5 escenario 3 (y cualquier otro 400): mostramos el mensaje del backend.
        this.historial.set(null);
        this.mensajeError.set(error.error?.message ?? this.mensajes.errorGeneral);
        this.cargando.set(false);
      },
    });
  }

  /** HU-5.1 escenario 4: con menos de 3 dígitos (o con letras) NO se consulta al servidor. */
  private pedirSugerencias(texto: string): Observable<ResultadoSugerencias> {
    if (!/^\d{3,10}$/.test(texto)) {
      return of({ texto, sugerencias: null });
    }
    return this.medicoService.sugerirPacientes(texto).pipe(
      map((sugerencias) => ({ texto, sugerencias })),
      catchError(() => of({ texto, sugerencias: null }))
    );
  }

  private mostrarSugerencias(resultado: ResultadoSugerencias): void {
    // Si el médico ya presionó Buscar con este mismo texto, no reabrimos la lista.
    if (resultado.texto === this.cedulaBuscada) {
      return;
    }
    if (resultado.sugerencias === null) {
      this.ocultarSugerencias();
      return;
    }
    this.sugerencias.set(resultado.sugerencias);
    // HU-5.1 escenario 3: sin coincidencias
    this.sinCoincidencias.set(resultado.sugerencias.length === 0);
  }
}