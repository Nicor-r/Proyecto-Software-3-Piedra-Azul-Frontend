import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { catchError, forkJoin, of } from 'rxjs';
import { RouterLink } from '@angular/router';
import { ToastrService } from '@iqx-limited/ngx-toastr';
import { CitasService, Cita, Doctor } from '../../core/services/citas';
import { Auth } from '../../core/services/auth';

type Pestana = 'proximas' | 'anteriores';

@Component({
  selector: 'app-mis-citas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mis-citas.html',
  styleUrl: './mis-citas.css',
})
export class MisCitas implements OnInit {
  private readonly citasService = inject(CitasService);
  private readonly auth = inject(Auth);
  private readonly toastr = inject(ToastrService);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  citas = signal<Cita[]>([]);
  cargando = signal(true);
  mensajeError = signal('');
  pestana = signal<Pestana>('proximas');

  /** id del profesional -> nombre real (de /api/doctores y /api/terapistas). */
  private readonly nombresProfesionales = signal<Map<string, string>>(new Map());

  /** Inicial del paciente para el avatar del encabezado (primera letra del correo). */
  readonly inicialUsuario = signal('P');

  /** Citas de hoy en adelante, de la más cercana a la más lejana. */
  readonly proximas = computed(() =>
    this.citas()
      .filter((c) => this.momento(c) >= Date.now())
      .sort((a, b) => this.momento(a) - this.momento(b))
  );

  /** Citas que ya pasaron, de la más reciente a la más antigua. */
  readonly anteriores = computed(() =>
    this.citas()
      .filter((c) => this.momento(c) < Date.now())
      .sort((a, b) => this.momento(b) - this.momento(a))
  );

  /** La cita destacada: la próxima que no esté cancelada. */
  readonly proximaCita = computed(
    () => this.proximas().find((c) => c.estado?.toUpperCase() !== 'CANCELADA') ?? null
  );

  /** Lista de la pestaña elegida (sin repetir la cita destacada). */
  readonly citasVisibles = computed(() => {
    if (this.pestana() === 'anteriores') {
      return this.anteriores();
    }
    const destacada = this.proximaCita();
    return this.proximas().filter((c) => c !== destacada);
  });

  ngOnInit(): void {
    // En el servidor (prerender) no hay token: solo se consulta en el navegador.
    if (!this.esNavegador) {
      return;
    }
    const email = this.auth.getUserEmail();
    if (email) {
      this.inicialUsuario.set(email.charAt(0).toUpperCase());
    }
    this.cargarCitas();
  }

  cargarCitas(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    // Se piden juntas las citas y la lista de profesionales para mostrar el nombre real
    // (si la lista falla, igual se muestran las citas).
    forkJoin({
      citas: this.citasService.obtenerMisCitas(),
      profesionales: this.citasService.obtenerDoctores().pipe(catchError(() => of<Doctor[]>([]))),
    }).subscribe({
      next: ({ citas, profesionales }) => {
        this.nombresProfesionales.set(
          new Map<string, string>(profesionales.map((p): [string, string] => [p.id, p.nombre]))
        );
        this.citas.set(citas);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al cargar citas:', error);
        this.mensajeError.set(error.error?.message ?? 'No se pudieron cargar tus citas');
        this.cargando.set(false);
      },
    });
  }

  cambiarPestana(pestana: Pestana): void {
    this.pestana.set(pestana);
  }

  /** Reagendar y cancelar se muestran según el diseño, pero el backend aún no los soporta para pacientes. */
  accionNoDisponible(accion: 'Reagendar' | 'Cancelar'): void {
    this.toastr.info(`La opción "${accion}" estará disponible próximamente.`, 'Próximamente');
  }

  /** Se pueden reagendar/cancelar solo las citas futuras que no estén canceladas ni completadas. */
  permiteAcciones(cita: Cita): boolean {
    const estado = cita.estado?.toUpperCase();
    return this.momento(cita) >= Date.now() && estado !== 'CANCELADA' && estado !== 'COMPLETADA';
  }

  // ---------- Formatos ----------

  /**
   * Nombre completo del profesional. Primero se busca por medicoId en la lista de
   * profesionales; si no aparece, se usa el medicoNombre que trae la cita.
   */
  private nombreCompleto(cita: Cita): string {
    return this.nombresProfesionales().get(cita.medicoId) ?? cita.medicoNombre ?? 'Profesional';
  }

  /** "Dr. Rocha - Medicina general" -> "Dr. Rocha" */
  nombreProfesional(cita: Cita): string {
    return this.nombreCompleto(cita).split(' - ')[0];
  }

  /** "Dr. Rocha - Medicina general" -> "Medicina general" (vacío si no viene) */
  detalleProfesional(cita: Cita): string {
    return this.nombreCompleto(cita).split(' - ')[1] ?? '';
  }

  /** "CONFIRMADA" -> "Confirmada" */
  textoEstado(estado: string): string {
    const e = (estado ?? '').toLowerCase();
    return e.charAt(0).toUpperCase() + e.slice(1);
  }

  claseEstado(estado: string): string {
    return 'estado--' + (estado ?? '').toLowerCase();
  }

  formatearHora(hora: string): string {
    const [h, m] = hora.split(':');
    const horaNum = parseInt(h, 10);
    const ampm = horaNum >= 12 ? 'p. m.' : 'a. m.';
    const hora12 = horaNum % 12 === 0 ? 12 : horaNum % 12;
    return `${hora12}:${m} ${ampm}`;
  }

  /** "2026-09-11" -> "Viernes 11 de septiembre" (agrega el año si no es el actual) */
  formatearFecha(fecha: string): string {
    const fechaLocal = this.fechaLocal(fecha);
    const texto = fechaLocal.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      ...(fechaLocal.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}),
    });
    const sinComa = texto.replace(',', '');
    return sinComa.charAt(0).toUpperCase() + sinComa.slice(1);
  }

  /** "2026-02-24" -> "24 de febrero" */
  formatearFechaCorta(fecha: string): string {
    return this.fechaLocal(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  }

  private fechaLocal(fecha: string): Date {
    const [y, m, d] = fecha.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /** Fecha y hora de la cita en milisegundos (hora local). */
  private momento(cita: Cita): number {
    const [y, m, d] = cita.fecha.split('-').map(Number);
    const [h, min] = (cita.hora ?? '00:00').split(':').map(Number);
    return new Date(y, m - 1, d, h || 0, min || 0).getTime();
  }
}