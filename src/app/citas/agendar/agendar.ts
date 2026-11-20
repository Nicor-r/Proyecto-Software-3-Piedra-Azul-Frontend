import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CitasService, Franja, Cita, Doctor } from '../../core/services/citas';
import { ToastrService } from '@iqx-limited/ngx-toastr';

/** Paso actual del asistente de agendamiento (solo para el indicador visual). */
type Paso = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-agendar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './agendar.html',
  styleUrl: './agendar.css',
})
export class AgendarCita implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly citasService = inject(CitasService);
  private readonly toastr = inject(ToastrService);

  readonly pasos = [
    { numero: 1, etiqueta: 'Profesional' },
    { numero: 2, etiqueta: 'Fecha' },
    { numero: 3, etiqueta: 'Horario' },
    { numero: 4, etiqueta: 'Confirmar' },
  ] as const;

  agendarForm: FormGroup;
  medicos = signal<Doctor[]>([]);
  cargandoMedicos = signal(true);
  franjas = signal<Franja[]>([]);
  cargandoFranjas = signal(false);
  busquedaRealizada = signal(false);
  franjaSeleccionada = signal<Franja | null>(null);
  agendando = signal(false);
  citaConfirmada = signal<Cita | null>(null);
  mensajeError = signal('');
  fechaMinima: string;

  /** Valores del formulario como signals para poder calcular el paso actual. */
  private readonly medicoIdActual = signal('');
  private readonly fechaActual = signal('');

  readonly medicoElegido = computed(
    () => this.medicos().find((m) => m.id === this.medicoIdActual()) ?? null
  );

  readonly franjasManana = computed(() =>
    this.franjas().filter((f) => parseInt(f.hora.split(':')[0], 10) < 12)
  );
  readonly franjasTarde = computed(() =>
    this.franjas().filter((f) => parseInt(f.hora.split(':')[0], 10) >= 12)
  );
  readonly totalDisponibles = computed(() => this.franjas().filter((f) => f.disponible).length);

  readonly pasoActual = computed<Paso>(() => {
    if (this.franjaSeleccionada() || this.citaConfirmada()) return 4;
    if (this.medicoIdActual() && this.fechaActual()) return 3;
    if (this.medicoIdActual()) return 2;
    return 1;
  });

  constructor() {
    this.fechaMinima = this.formatoISO(new Date());

    this.agendarForm = this.fb.group({
      medicoId: ['', [Validators.required]],
      fecha: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.cargarDoctores();
  }

  cargarDoctores(): void {
    this.cargandoMedicos.set(true);
    this.citasService.obtenerDoctores().subscribe({
      next: (doctores) => {
        this.medicos.set(doctores.filter((d) => d.activo));
        this.cargandoMedicos.set(false);
      },
      error: (err) => {
        console.error('Error al cargar médicos:', err);
        this.mensajeError.set('No se pudo cargar la lista de profesionales.');
        this.cargandoMedicos.set(false);
      },
    });
  }

  get medicoSeleccionado(): string {
    return this.agendarForm.get('medicoId')?.value;
  }

  get fechaSeleccionada(): string {
    return this.agendarForm.get('fecha')?.value;
  }

  // ---------- Paso 1: profesional ----------
  elegirMedico(medico: Doctor): void {
    this.agendarForm.patchValue({ medicoId: medico.id });
    this.medicoIdActual.set(medico.id);
    this.buscarSiEstaCompleto();
  }

  // ---------- Paso 2: fecha ----------
  elegirFecha(fecha: string): void {
    this.agendarForm.patchValue({ fecha });
    this.fechaActual.set(fecha);
    this.buscarSiEstaCompleto();
  }

  /** Atajos de fecha: hoy y los próximos 6 días. */
  readonly diasRapidos = Array.from({ length: 7 }, (_, i) => {
    const dia = new Date();
    dia.setDate(dia.getDate() + i);
    return {
      valor: this.formatoISO(dia),
      nombre: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : this.capitalizar(dia.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')),
      numero: dia.getDate(),
    };
  });

  private buscarSiEstaCompleto(): void {
    if (this.medicoSeleccionado && this.fechaSeleccionada) {
      this.buscarFranjas();
    }
  }

  // ---------- Paso 3: horarios ----------
  buscarFranjas(): void {
    this.mensajeError.set('');
    this.franjas.set([]);
    this.franjaSeleccionada.set(null);
    this.citaConfirmada.set(null);

    if (this.agendarForm.invalid) {
      this.agendarForm.markAllAsTouched();
      return;
    }

    const { medicoId, fecha } = this.agendarForm.value;
    this.cargandoFranjas.set(true);

    this.citasService.obtenerFranjasDisponibles(medicoId, fecha).subscribe({
      next: (franjas) => {
        this.franjas.set(franjas);
        this.busquedaRealizada.set(true);
        this.cargandoFranjas.set(false);
      },
      error: (error) => {
        console.error('Error al obtener franjas:', error);
        this.mensajeError.set(
          error.error?.message ?? 'No se pudieron cargar los horarios disponibles'
        );
        this.busquedaRealizada.set(true);
        this.cargandoFranjas.set(false);
      },
    });
  }

  seleccionarFranja(franja: Franja): void {
    if (!franja.disponible) return;
    this.mensajeError.set('');
    this.franjaSeleccionada.set(franja);
  }

  cancelarSeleccion(): void {
    this.franjaSeleccionada.set(null);
  }

  // ---------- Paso 4: confirmar ----------
  confirmarCita(): void {
    const franja = this.franjaSeleccionada();
    if (!franja) return;

    this.mensajeError.set('');
    this.agendando.set(true);

    const request = {
      medicoId: this.medicoSeleccionado,
      fecha: this.fechaSeleccionada,
      hora: franja.hora,
    };

    this.citasService.agendarCita(request).subscribe({
      next: (cita: Cita) => {
        this.agendando.set(false);
        this.franjaSeleccionada.set(null);
        this.citaConfirmada.set(cita);
        this.toastr.success(
          `Tu cita quedó para el ${this.formatearFecha(cita.fecha)} a las ${this.formatearHora(cita.hora)}`,
          '¡Cita agendada!'
        );
      },
      error: (error) => {
        console.error('Error al agendar cita:', error);
        const mensaje =
          typeof error.error === 'string'
            ? error.error
            : error.error?.message ?? 'No se pudo agendar la cita';
        this.agendando.set(false);
        this.mensajeError.set(mensaje);
        this.toastr.error(mensaje, 'Error al agendar');
        // Refresca los horarios por si alguien más tomó ese espacio
        this.buscarFranjas();
      },
    });
  }

  agendarOtra(): void {
    this.citaConfirmada.set(null);
    this.franjaSeleccionada.set(null);
    this.franjas.set([]);
    this.busquedaRealizada.set(false);
    this.agendarForm.reset({ medicoId: '', fecha: '' });
    this.medicoIdActual.set('');
    this.fechaActual.set('');
  }

  // ---------- Utilidades de formato ----------
  formatearHora(hora: string): string {
    // "10:00:00" -> "10:00 a. m."
    const [h, m] = hora.split(':');
    const horaNum = parseInt(h, 10);
    const ampm = horaNum >= 12 ? 'p. m.' : 'a. m.';
    const hora12 = horaNum % 12 === 0 ? 12 : horaNum % 12;
    return `${hora12}:${m} ${ampm}`;
  }

  /** "2026-11-20" -> "jueves, 20 de noviembre" (sin desfase de zona horaria). */
  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  iniciales(nombre: string): string {
    const limpio = nombre.split(' - ')[0].replace(/^Dra?\.\s*/i, '').trim();
    return (
      limpio
        .split(/\s+/)
        .filter((p) => p.length > 0)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join('') || 'PA'
    );
  }

  private formatoISO(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private capitalizar(texto: string): string {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
}