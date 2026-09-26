import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CitasService, Franja, Cita } from '../../core/services/citas';

interface Medico {
  id: string;
  nombre: string;
  especialidad: string;
}

@Component({
  selector: 'app-agendar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './agendar.html',
  styleUrl: './agendar.css',
})
export class AgendarCita {

  private readonly fb = inject(FormBuilder);
  private readonly citasService = inject(CitasService);

  agendarForm: FormGroup;
  franjas = signal<Franja[]>([]);
  cargandoFranjas = signal(false);
  mensajeExito = signal('');
  mensajeError = signal('');
  fechaMinima: string;

  // Médicos disponibles (mock por ahora; en el futuro vendrán del backend)
  medicos: Medico[] = [
    { id: '1', nombre: 'Dra. Ibis González', especialidad: 'Cardiología' },
    { id: '2', nombre: 'Dra. Clara Inés',   especialidad: 'Diabetes' },
    { id: '3', nombre: 'Dr. Rocha',         especialidad: 'Terapia física' },
  ];

  constructor() {
    const hoy = new Date();
    this.fechaMinima = hoy.toISOString().split('T')[0];

    this.agendarForm = this.fb.group({
      medicoId: ['', [Validators.required]],
      fecha:    ['', [Validators.required]],
    });
  }

  get medicoSeleccionado(): string {
    return this.agendarForm.get('medicoId')?.value;
  }

  get fechaSeleccionada(): string {
    return this.agendarForm.get('fecha')?.value;
  }

  buscarFranjas(): void {
    this.mensajeExito.set('');
    this.mensajeError.set('');
    this.franjas.set([]);

    if (this.agendarForm.invalid) {
      this.agendarForm.markAllAsTouched();
      return;
    }

    const { medicoId, fecha } = this.agendarForm.value;
    this.cargandoFranjas.set(true);

    this.citasService.obtenerFranjasDisponibles(medicoId, fecha).subscribe({
      next: (franjas) => {
        this.franjas.set(franjas);
        this.cargandoFranjas.set(false);
      },
      error: (error) => {
        console.error('Error al obtener franjas:', error);
        this.mensajeError.set(
          error.error?.message ?? 'No se pudieron cargar las franjas disponibles'
        );
        this.cargandoFranjas.set(false);
      }
    });
  }

  seleccionarFranja(franja: Franja): void {
    if (!franja.disponible) return;

    this.mensajeExito.set('');
    this.mensajeError.set('');

    const request = {
      medicoId: this.agendarForm.get('medicoId')?.value,
      fecha:    this.agendarForm.get('fecha')?.value,
      hora:     franja.hora,
    };

    this.citasService.agendarCita(request).subscribe({
      next: (cita: Cita) => {
        this.mensajeExito.set(
          `¡Cita agendada! ${cita.fecha} a las ${cita.hora} con estado ${cita.estado}`
        );
        // Refresca las franjas para que la recién ocupada salga deshabilitada
        this.buscarFranjas();
      },
      error: (error) => {
        console.error('Error al agendar cita:', error);
        const mensaje =
          typeof error.error === 'string'
            ? error.error
            : error.error?.message ?? 'No se pudo agendar la cita';
        this.mensajeError.set(mensaje);
      }
    });
  }

  formatearHora(hora: string): string {
    // "10:00:00" -> "10:00 a. m."
    const [h, m] = hora.split(':');
    const horaNum = parseInt(h, 10);
    const ampm = horaNum >= 12 ? 'p. m.' : 'a. m.';
    const hora12 = horaNum % 12 === 0 ? 12 : horaNum % 12;
    return `${hora12}:${m} ${ampm}`;
  }
}