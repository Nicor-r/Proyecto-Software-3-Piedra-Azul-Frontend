import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface Caracteristica {
  icono: 'corazon' | 'usuarios' | 'reloj' | 'escudo';
  titulo: string;
  texto: string;
}

interface Horario {
  hora: string;
  disponible: boolean;
}

interface Doctor {
  id: number;
  nombre: string;
  especialidad: string;
  horarios: Horario[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  mapaUrl: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {
    this.mapaUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d498.2796833228189!2d-76.569252122733!3d2.4276543373221613!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1ses-419!2sco!4v1789531520546!5m2!1ses-419!2sco'
    );
  }
  caracteristicas: Caracteristica[] = [
    {
      icono: 'corazon',
      titulo: 'Te llamamos por tu nombre',
      texto: 'Cada paciente tiene un historial que conocemos antes de que llegue a la cita, no una ficha genérica.',
    },
    {
      icono: 'usuarios',
      titulo: 'Especialistas que se conocen entre sí',
      texto: 'Medicina general, terapia y especialidades trabajan coordinadas, no como consultorios aislados.',
    },
    {
      icono: 'reloj',
      titulo: 'Citas el mismo día si es urgente',
      texto: 'Reservamos franjas diarias para imprevistos, para que una molestia no espere una semana.',
    },
    {
      icono: 'escudo',
      titulo: 'Historial clínico siempre a la mano',
      texto: 'Tus resultados y tratamientos quedan registrados y disponibles para cualquier especialista que te atienda.',
    },
  ];

  doctores: Doctor[] = [
    {
      id: 1,
      nombre: 'Dra. Ibis González',
      especialidad: 'Cardiología',
      horarios: [
        { hora: '8:00 a. m.', disponible: true },
        { hora: '9:00 a. m.', disponible: false },
        { hora: '11:00 a. m.', disponible: true },
        { hora: '2:00 p. m.', disponible: true },
      ],
    },
    {
      id: 2,
      nombre: 'Dra. Clara Inés',
      especialidad: 'Diabetes',
      horarios: [
        { hora: '8:30 a. m.', disponible: true },
        { hora: '10:00 a. m.', disponible: true },
        { hora: '12:30 p. m.', disponible: false },
        { hora: '3:00 p. m.', disponible: true },
      ],
    },
    {
      id: 3,
      nombre: 'Dr. Rocha',
      especialidad: 'Terapia física',
      horarios: [
        { hora: '9:00 a. m.', disponible: true },
        { hora: '10:30 a. m.', disponible: false },
        { hora: '1:30 p. m.', disponible: true },
        { hora: '4:00 p. m.', disponible: true },
      ],
    },
  ];

  expandido = signal<number | null>(null);

  alternar(id: number): void {
    this.expandido.update((actual) => (actual === id ? null : id));
  }

  estaAbierto(id: number): boolean {
    return this.expandido() === id;
  }
}