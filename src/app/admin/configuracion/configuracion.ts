import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { forkJoin, map, catchError, of } from 'rxjs';
import {
  ConfiguracionAgendaRequest,
  DiaSemana,
  DoctorResponse,
  ScheduleConfigService,
} from '../../core/services/schedule-config';

const INTERVALO_MIN = 10;
const INTERVALO_MAX = 120;

/** Días de la semana en el orden y etiquetas usados en la interfaz. */
const DIAS_SEMANA: { clave: DiaSemana; etiqueta: string }[] = [
  { clave: 'MONDAY', etiqueta: 'Lun' },
  { clave: 'TUESDAY', etiqueta: 'Mar' },
  { clave: 'WEDNESDAY', etiqueta: 'Mié' },
  { clave: 'THURSDAY', etiqueta: 'Jue' },
  { clave: 'FRIDAY', etiqueta: 'Vie' },
  { clave: 'SATURDAY', etiqueta: 'Sáb' },
  { clave: 'SUNDAY', etiqueta: 'Dom' },
];

/** Réplica en el frontend del invariante de `VentanaAgendamiento` (semanas > 0, entero). */
function enteroPositivoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === '') {
      return null; // el `required` se encarga del campo vacío
    }
    const valor = Number(control.value);
    if (!Number.isInteger(valor) || valor <= 0) {
      return { enteroInvalido: true };
    }
    return null;
  };
}

/** Réplica del invariante de `IntervaloCitas` (10 a 120 minutos, entero). */
function intervaloValidoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === '') {
      return null;
    }
    const valor = Number(control.value);
    if (!Number.isInteger(valor) || valor < INTERVALO_MIN || valor > INTERVALO_MAX) {
      return { intervaloInvalido: true };
    }
    return null;
  };
}

/** Réplica del invariante de `FranjaHoraria` (hora de inicio anterior a la de fin). */
function franjaHorariaValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const inicio = group.get('horaInicio')?.value;
    const fin = group.get('horaFin')?.value;
    if (!inicio || !fin) {
      return null;
    }
    return inicio < fin ? null : { horaInicioNoAnterior: true };
  };
}

interface PanelDoctor {
  doctor: DoctorResponse;
  abierto: boolean;
  dias: Set<DiaSemana>;
  diasTocado: boolean;
  form: FormGroup;
  guardando: boolean;
  mensajeError: string;
  mensajeExito: string;
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css',
})
export class Configuracion implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly scheduleConfigService = inject(ScheduleConfigService);

  readonly diasSemana = DIAS_SEMANA;
  readonly opcionesVentana = [1, 2, 3, 4, 6, 8, 10, 12];

  cargando = signal(true);
  guardandoTodo = signal(false);
  mensajeErrorCarga = signal('');
  mensajeGlobalExito = signal('');
  mensajeGlobalError = signal('');

  ventanaForm: FormGroup = this.fb.group({
    ventanaSemanas: [4, [Validators.required, enteroPositivoValidator()]],
  });

  paneles: PanelDoctor[] = [];

  ngOnInit(): void {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    this.cargando.set(true);
    this.mensajeErrorCarga.set('');

    this.scheduleConfigService.listarDoctores().subscribe({
      next: (doctores) => {
        if (doctores.length === 0) {
          this.paneles = [];
          this.cargando.set(false);
          return;
        }

        const configuraciones$ = doctores.map((doctor) =>
          this.scheduleConfigService.obtenerConfiguracion(doctor.id).pipe(
            map((config) => ({ doctor, config })),
            catchError(() => of({ doctor, config: null }))
          )
        );

        forkJoin(configuraciones$).subscribe({
          next: (resultados) => {
            this.paneles = resultados.map(({ doctor, config }) => this.crearPanel(doctor, config));

            // La ventana de agendamiento se comparte para todo el agendamiento
            // autónomo; se precarga con la de cualquier doctor que ya tenga
            // configuración guardada.
            const configuracionExistente = resultados.find((r) => r.config)?.config;
            if (configuracionExistente) {
              this.ventanaForm.patchValue({
                ventanaSemanas: configuracionExistente.ventanaSemanas,
              });
            }

            this.cargando.set(false);
          },
          error: () => {
            this.mensajeErrorCarga.set('No se pudo cargar la configuración de agenda.');
            this.cargando.set(false);
          },
        });
      },
      error: () => {
        this.mensajeErrorCarga.set('No se pudo cargar el listado de médicos y terapistas.');
        this.cargando.set(false);
      },
    });
  }

  private crearPanel(
    doctor: DoctorResponse,
    config: { diasAtencion: DiaSemana[]; horaInicio: string; horaFin: string; intervaloMinutos: number } | null
  ): PanelDoctor {
    return {
      doctor,
      abierto: false,
      dias: new Set(config?.diasAtencion ?? []),
      diasTocado: false,
      guardando: false,
      mensajeError: '',
      mensajeExito: '',
      form: this.fb.group(
        {
          horaInicio: [config ? this.aHoraCorta(config.horaInicio) : '', [Validators.required]],
          horaFin: [config ? this.aHoraCorta(config.horaFin) : '', [Validators.required]],
          intervaloMinutos: [
            config?.intervaloMinutos ?? null,
            [Validators.required, intervaloValidoValidator()],
          ],
        },
        { validators: franjaHorariaValidator() }
      ),
    };
  }

  alternarPanel(panel: PanelDoctor): void {
    if (!panel.doctor.activo) {
      panel.mensajeError = 'Debe seleccionar un médico/terapista válido.';
      return;
    }
    panel.abierto = !panel.abierto;
  }

  alternarDia(panel: PanelDoctor, dia: DiaSemana): void {
    if (panel.dias.has(dia)) {
      panel.dias.delete(dia);
    } else {
      panel.dias.add(dia);
    }
    panel.diasTocado = true;
  }

  diaSeleccionado(panel: PanelDoctor, dia: DiaSemana): boolean {
    return panel.dias.has(dia);
  }

  mostrarErrorDias(panel: PanelDoctor): boolean {
    return panel.diasTocado && panel.dias.size === 0;
  }

  get ventanaInvalidaVacia(): boolean {
    const control = this.ventanaForm.get('ventanaSemanas');
    return !!control?.hasError('required') && !!control?.touched;
  }

  get ventanaInvalidaValor(): boolean {
    const control = this.ventanaForm.get('ventanaSemanas');
    return !!control?.hasError('enteroInvalido') && !!control?.touched;
  }

  errorCampo(panel: PanelDoctor, campo: string): boolean {
  const control = panel.form.get(campo);
  return !!control?.invalid && !!(control?.touched || control?.dirty);
}

  errorFranjaHoraria(panel: PanelDoctor): boolean {
    return (
      panel.form.hasError('horaInicioNoAnterior') &&
      !!panel.form.get('horaInicio')?.touched &&
      !!panel.form.get('horaFin')?.touched
    );
  }

  errorIntervalo(panel: PanelDoctor): boolean {
    const control = panel.form.get('intervaloMinutos');
    return !!control?.hasError('intervaloInvalido') && !!control?.touched;
  }

  guardarCambios(): void {
    this.mensajeGlobalExito.set('');
    this.mensajeGlobalError.set('');

    this.ventanaForm.markAllAsTouched();
    if (this.ventanaForm.invalid) {
      this.mensajeGlobalError.set('Revisa la ventana de agendamiento antes de guardar.');
      return;
    }

    const panelesActivos = this.paneles.filter((p) => p.doctor.activo);
    let hayErrores = false;

    for (const panel of panelesActivos) {
      panel.mensajeError = '';
      panel.mensajeExito = '';
      panel.form.markAllAsTouched();
      panel.diasTocado = true;

      if (panel.form.invalid || panel.dias.size === 0) {
        hayErrores = true;
        panel.abierto = true;
      }
    }

    if (hayErrores) {
      this.mensajeGlobalError.set(
        'Revisa los campos marcados en cada especialista antes de guardar.'
      );
      return;
    }

    const ventanaSemanas = Number(this.ventanaForm.get('ventanaSemanas')?.value);

    this.guardandoTodo.set(true);

    const solicitudes$ = panelesActivos.map((panel) => {
      const request: ConfiguracionAgendaRequest = {
        doctorId: panel.doctor.id,
        ventanaSemanas,
        diasAtencion: Array.from(panel.dias),
        horaInicio: this.aHoraLarga(panel.form.get('horaInicio')?.value),
        horaFin: this.aHoraLarga(panel.form.get('horaFin')?.value),
        intervaloMinutos: Number(panel.form.get('intervaloMinutos')?.value),
      };

      return this.scheduleConfigService.guardarConfiguracion(request).pipe(
        map(() => ({ panel, ok: true as const, mensaje: '' })),
        catchError((error) =>
          of({
            panel,
            ok: false as const,
            mensaje: error?.error?.message ?? 'No se pudo guardar la configuración.',
          })
        )
      );
    });

    if (solicitudes$.length === 0) {
      this.guardandoTodo.set(false);
      this.mensajeGlobalExito.set('Ventana de agendamiento actualizada correctamente.');
      return;
    }

    forkJoin(solicitudes$).subscribe((resultados) => {
      this.guardandoTodo.set(false);

      let algunFallo = false;
      for (const resultado of resultados) {
        if (resultado.ok) {
          resultado.panel.mensajeExito = 'Configuración actualizada correctamente.';
        } else {
          resultado.panel.mensajeError = resultado.mensaje;
          resultado.panel.abierto = true;
          algunFallo = true;
        }
      }

      if (algunFallo) {
        this.mensajeGlobalError.set(
          'Algunos especialistas no se pudieron actualizar; revisa los mensajes en cada tarjeta.'
        );
      } else {
        this.mensajeGlobalExito.set(
          'Ventana de agendamiento y disponibilidad por especialista actualizadas correctamente.'
        );
      }
    });
  }

  private aHoraCorta(horaLarga: string): string {
    // "08:00:00" -> "08:00" (formato del <input type="time">)
    return horaLarga?.slice(0, 5) ?? '';
  }

  private aHoraLarga(horaCorta: string): string {
    // "08:00" -> "08:00:00" (formato esperado por el backend)
    return horaCorta?.length === 5 ? `${horaCorta}:00` : horaCorta;
  }
}
