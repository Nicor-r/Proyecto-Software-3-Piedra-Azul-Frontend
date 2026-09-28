import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CitasService, Franja, Cita } from '../../core/services/citas';
import { Auth } from '../../core/services/auth';

interface Medico {
  id: string;
  nombre: string;
  especialidad: string;
}

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'] as const;

function alMenosUnDia(group: AbstractControl): ValidationErrors | null {
  return Object.values(group.value).some(Boolean) ? null : { sinDias: true };
}

function rangoHorario(group: AbstractControl): ValidationErrors | null {
  const { horaInicio, horaFin } = group.value;
  return horaInicio && horaFin && horaInicio < horaFin ? null : { rangoInvalido: true };
}

@Component({
  selector: 'app-gestionar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './gestionar.html',
  styleUrl: './gestionar.css',
})
export class gestionar {

  private readonly fb = inject(FormBuilder);
  private readonly citasService = inject(CitasService);

  form = new FormGroup({
    semanas: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(52),
    ]),
  });

  constructor() {
    const hoy = new Date();
    this.fechaMinima = hoy.toISOString().split('T')[0];

    this.agendarForm = this.fb.group({
      medicoId: ['', [Validators.required]],
      fecha:    ['', [Validators.required]],
    });

    guardar(): void {
    if (this.form.invalid) return;
    const semanas = this.form.value.semanas;
    // llamar al servicio aquí
  }
  }
}