import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import { CitasService, Cita, Doctor } from './../../core/services/citas';
import { MedicoService, PacienteSugerencia } from './../../core/services/medico';
import { claseEstado, formatearFecha, formatearHora, textoEstado } from '../../medico/formato-cita';

export const MENSAJES_HISTORIAL = {
  cedulaVacia: 'Debe ingresar el número de cédula',
  formatoInvalido: 'La cédula debe contener solo números, entre 6 y 10 dígitos',
  sinCitas: 'El paciente no tiene citas registradas',
  sinCoincidencias: 'No se encontraron pacientes con esa cédula',
  errorGeneral: 'Ocurrió un error al consultar el historial. Intenta de nuevo.',
} as const;

export const ESPERA_SUGERENCIAS_MS = 300;

interface ResultadoSugerencias {
  texto: string;
  sugerencias: PacienteSugerencia[] | null;
}

/** Resultado que se muestra después de buscar una cédula. */
interface ResultadoHistorial {
  cedula: string;
  nombrePaciente: string;
  citas: Cita[];
}

@Component({
  selector: 'app-historial-agendador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './historial-agendador.html',
  styleUrls: ['../estilos-agendador.css', './historial-agendador.css'],
})
export class HistorialAgendador {
  private readonly fb = inject(FormBuilder);
  private readonly citasService = inject(CitasService);
  private readonly medicoService = inject(MedicoService); // Para las sugerencias de cédula

  readonly mensajes = MENSAJES_HISTORIAL;

  readonly formulario = this.fb.nonNullable.group({
    cedula: ['', [Validators.required, Validators.pattern(/^\d{6,10}$/)]],
  });

  /** null = todavía no se ha buscado (o la búsqueda falló). */
  readonly historial = signal<ResultadoHistorial | null>(null);
  readonly cargando = signal(false);
  readonly mensajeError = signal('');

  // Autocompletado
  readonly sugerencias = signal<PacienteSugerencia[]>([]);
  readonly sinCoincidencias = signal(false);
  private readonly textoEscrito$ = new Subject<string>();
  private cedulaBuscada = '';

  /** id del profesional -> nombre real (evita mostrar "Médico #doc-x"). */
  private readonly nombresProfesionales = signal<Map<string, string>>(new Map());

  // Mismos formatos que el panel del médico
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

    this.citasService
      .obtenerDoctores()
      .pipe(catchError(() => of<Doctor[]>([])), takeUntilDestroyed())
      .subscribe((profesionales) =>
        this.nombresProfesionales.set(
          new Map<string, string>(profesionales.map((p): [string, string] => [p.id, p.nombre]))
        )
      );
  }

  get cedula() {
    return this.formulario.controls.cedula;
  }

  alEscribirCedula(texto: string): void {
    this.cedulaBuscada = '';
    this.textoEscrito$.next(texto);
  }

  seleccionarSugerencia(sugerencia: PacienteSugerencia): void {
    this.cedula.setValue(sugerencia.cedula);
    this.buscar();
  }

  ocultarSugerencias(): void {
    this.sugerencias.set([]);
    this.sinCoincidencias.set(false);
  }

  mensajeCampoCedula(): string {
    if (!this.cedula.touched || this.cedula.valid) {
      return '';
    }
    return this.cedula.hasError('required') ? this.mensajes.cedulaVacia : this.mensajes.formatoInvalido;
  }

  nombreProfesional(cita: Cita): string {
    return this.nombresProfesionales().get(cita.medicoId) ?? cita.medicoNombre ?? cita.medicoId;
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

    const cedula = this.cedula.value;
    this.cargando.set(true);

    this.citasService.obtenerHistorialPaciente(cedula).subscribe({
      next: (citas) => {
        this.historial.set({
          cedula,
          nombrePaciente: citas.find((c) => c.pacienteNombre)?.pacienteNombre ?? '',
          citas,
        });
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.historial.set(null);
        // Muestra el mensaje exacto del backend (ej: "Paciente no encontrado con identificacion 1061000004")
        this.mensajeError.set(error.error?.message ?? this.mensajes.errorGeneral);
        this.cargando.set(false);
      },
    });
  }

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
    if (resultado.texto === this.cedulaBuscada) return;
    if (resultado.sugerencias === null) {
      this.ocultarSugerencias();
      return;
    }
    this.sugerencias.set(resultado.sugerencias);
    this.sinCoincidencias.set(resultado.sugerencias.length === 0);
  }
}