import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  AgendadorService,
  CitaAgendadorItem,
  DoctorItem,
  ListadoCitasResponse
} from '../../core/services/agendador';

@Component({
  selector: 'app-citas-agendador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './citas-agendador.html',
  styleUrl: './citas-agendador.css',
})
export class CitasAgendador implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly agendadorService = inject(AgendadorService);

  filtroForm: FormGroup;
  doctores = signal<DoctorItem[]>([]);
  todasLasCitas = signal<CitaAgendadorItem[]>([]);
  citasPaginadas = signal<CitaAgendadorItem[]>([]);
  totalCitas = signal<number>(0);
  cargando = signal<boolean>(false);
  mensajeInfo = signal<string>('');
  mensajeError = signal<string>('');

  // Paginación
  paginaActual = signal<number>(1);
  elementosPorPagina = 10;
  totalPaginas = signal<number>(1);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    this.filtroForm = this.fb.group({
      medicoId: [''],
      fecha: [''],
      estado: ['TODOS'],
    });
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.cargarDoctores();
      this.ejecutarBusquedaInicial();
    }
  }

  cargarDoctores(): void {
    this.agendadorService.listarDoctores().subscribe({
      next: (docs) => {
        this.doctores.set(docs);
      },
      error: () => {
        // En caso de fallo de red, usamos doctores de respaldo
        this.doctores.set([
          { id: 'doc-1', nombre: 'Dra. Ana Martinez - Medicina General', activo: true },
          { id: 'doc-2', nombre: 'Dr. Carlos Ruiz - Fisioterapia', activo: true },
          { id: 'doc-4', nombre: 'Dra. Ibis González - Cardiología', activo: true },
          { id: 'doc-5', nombre: 'Dra. Clara Inés - Endocrinología', activo: true },
          { id: 'doc-6', nombre: 'Dr. Rocha - Terapia Física', activo: true },
          { id: 'doc-7', nombre: 'Dra. Pastrana - Pediatría', activo: true },
        ]);
      }
    });
  }

  ejecutarBusquedaInicial(): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    this.mensajeInfo.set('');

    this.agendadorService.listarCitas().subscribe({
      next: (resp: ListadoCitasResponse) => {
        this.aplicarResultados(resp);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar citas iniciales:', err);
        this.cargando.set(false);
      }
    });
  }

  buscarCitas(): void {
    this.mensajeError.set('');
    this.mensajeInfo.set('');

    const medicoId = this.filtroForm.get('medicoId')?.value;
    const fecha = this.filtroForm.get('fecha')?.value;
    const estado = this.filtroForm.get('estado')?.value;

    // No es obligatorio ingresar fecha si se selecciona un médico

    // Validación HU-1: fecha no anterior a hoy
    if (fecha) {
      const hoy = new Date().toISOString().split('T')[0];
      if (fecha < hoy) {
        this.mensajeError.set('La fecha ingresada no es válida');
        return;
      }
    }

    this.cargando.set(true);
    this.paginaActual.set(1);

    this.agendadorService.listarCitas(medicoId, fecha, estado).subscribe({
      next: (resp: ListadoCitasResponse) => {
        this.aplicarResultados(resp);
        this.cargando.set(false);
        if (resp.total === 0) {
          this.mensajeInfo.set('No se encontraron citas para la fecha y el médico/terapista seleccionados');
        }
      },
      error: (err) => {
        console.error('Error al buscar citas:', err);
        const mensaje = err?.error?.message ?? 'Ocurrió un error al consultar las citas';
        this.mensajeError.set(mensaje);
        this.cargando.set(false);
      }
    });
  }

  aplicarResultados(resp: ListadoCitasResponse): void {
    this.todasLasCitas.set(resp.citas);
    this.totalCitas.set(resp.total);

    const pags = Math.ceil(resp.total / this.elementosPorPagina) || 1;
    this.totalPaginas.set(pags);
    this.actualizarPagina(1);
  }

  actualizarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.paginaActual.set(pagina);

    const inicio = (pagina - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    this.citasPaginadas.set(this.todasLasCitas().slice(inicio, fin));
  }

  cambiarPagina(pagina: number): void {
    this.actualizarPagina(pagina);
  }

  paginaAnterior(): void {
    if (this.paginaActual() > 1) {
      this.actualizarPagina(this.paginaActual() - 1);
    }
  }

  paginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas()) {
      this.actualizarPagina(this.paginaActual() + 1);
    }
  }

  get paginasArray(): number[] {
    const total = this.totalPaginas();
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  formatearFecha(fechaStr: string): string {
    if (!fechaStr) return '';
    try {
      const [y, m, d] = fechaStr.split('-').map(Number);
      const fecha = new Date(y, m - 1, d);
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      return `${dias[fecha.getDay()]} ${fecha.getDate()} de ${meses[fecha.getMonth()]}`;
    } catch {
      return fechaStr;
    }
  }

  formatearHora(horaStr: string): string {
    if (!horaStr) return '';
    try {
      const [h, m] = horaStr.split(':');
      const horaNum = parseInt(h, 10);
      const ampm = horaNum >= 12 ? 'p. m.' : 'a. m.';
      const hora12 = horaNum % 12 === 0 ? 12 : horaNum % 12;
      return `${hora12}:${m} ${ampm}`;
    } catch {
      return horaStr;
    }
  }

  obtenerNombreMedico(cita: CitaAgendadorItem): string {
    if (cita.medicoNombre) return cita.medicoNombre;
    const doc = this.doctores().find((d) => d.id === cita.medicoId);
    return doc ? doc.nombre : cita.medicoId;
  }

  obtenerNombrePaciente(cita: CitaAgendadorItem): string {
    if (cita.pacienteNombre && cita.pacienteNombre.trim() !== '') {
      return cita.pacienteNombre;
    }
    return cita.pacienteId;
  }

  formatearEstadoTexto(estado: string): string {
    if (!estado) return '';
    const mayus = estado.toUpperCase();
    if (mayus === 'CONFIRMADA') return 'Confirmada';
    if (mayus === 'PENDIENTE') return 'Pendiente';
    if (mayus === 'COMPLETADA') return 'Completada';
    if (mayus === 'CANCELADA') return 'Cancelada';
    return estado;
  }

  obtenerClaseEstado(estado: string): string {
    const mayus = (estado || '').toUpperCase();
    switch (mayus) {
      case 'CONFIRMADA':
        return 'badge-estado badge-estado--confirmada';
      case 'PENDIENTE':
        return 'badge-estado badge-estado--pendiente';
      case 'COMPLETADA':
        return 'badge-estado badge-estado--completada';
      case 'CANCELADA':
        return 'badge-estado badge-estado--cancelada';
      default:
        return 'badge-estado';
    }
  }
}
