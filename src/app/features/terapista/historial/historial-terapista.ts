import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import { CitasService, Cita } from '../../../core/services/citas';
import { MedicoService, PacienteSugerencia } from '../../../core/services/medico'; // Si tienes el servicio de sugerencias

export const MENSAJES_HISTORIAL = {
  cedulaVacia: 'Debe ingresar el número de cédula',
  formatoInvalido: 'La cédula debe contener solo números, entre 6 y 10 dígitos',
  sinCitas: 'El paciente no tiene citas registradas',
  errorGeneral: 'Ocurrió un error al consultar el historial. Intenta de nuevo.',
} as const;

export const ESPERA_SUGERENCIAS_MS = 300;

interface ResultadoSugerencias {
  texto: string;
  sugerencias: PacienteSugerencia[] | null;
}

@Component({
  selector: 'app-historial-terapista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './historial-terapista.html',
  styleUrls: ['../estilos-terapista.css', './historial-terapista.css'], // Asegúrate de tener el CSS
})
export class HistorialTerapista {
  private readonly fb = inject(FormBuilder);
  private readonly citasService = inject(CitasService);
  private readonly medicoService = inject(MedicoService); // Para las sugerencias de cédula

  readonly mensajes = MENSAJES_HISTORIAL;

  readonly formulario = this.fb.nonNullable.group({
    cedula: ['', [Validators.required, Validators.pattern(/^\d{6,10}$/)]],
  });

  // Usamos Cita[] directo porque tu backend devuelve eso
  readonly historial = signal<Cita[]>([]);
  readonly cargando = signal(false);
  readonly mensajeError = signal('');

  // Autocompletado
  readonly sugerencias = signal<PacienteSugerencia[]>([]);
  readonly sinCoincidencias = signal(false);
  private readonly textoEscrito$ = new Subject<string>();
  private cedulaBuscada = '';

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

  buscar(): void {
    this.mensajeError.set('');
    this.cedula.setValue(this.cedula.value.trim());
    this.cedula.markAsTouched();
    this.cedulaBuscada = this.cedula.value;
    this.ocultarSugerencias();

    if (this.cedula.invalid) {
      this.historial.set([]);
      return;
    }

    this.cargando.set(true);
    // Usamos tu servicio de citas
    this.citasService.obtenerHistorialPaciente(this.cedula.value).subscribe({
      next: (citas) => {
        this.historial.set(citas);
        if (citas.length === 0) {
           this.mensajeError.set(this.mensajes.sinCitas);
        }
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.historial.set([]);
        this.mensajeError.set(error.error?.message ?? this.mensajes.errorGeneral);
        this.cargando.set(false);
      },
    });
  }

  private pedirSugerencias(texto: string): Observable<ResultadoSugerencias> {
    if (!/^\d{3,10}$/.test(texto)) {
      return of({ texto, sugerencias: null });
    }
    // Si tu compañero tiene el endpoint de sugerencias en MedicoService, lo reutilizamos
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