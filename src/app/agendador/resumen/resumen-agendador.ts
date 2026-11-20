import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AgendadorService, CitaAgendadorItem } from '../../core/services/agendador';
import { CitasService, Doctor } from '../../core/services/citas';

const DIAS_PROXIMOS = 7;

interface ConteoProfesional {
    medicoId: string;
    nombre: string;
    cantidad: number;
    porcentaje: number; // ancho de la barra (0-100)
}

/**
 * Resumen del agendador: la agenda del día y lo que viene.
 * Solo LEE datos que el backend ya entrega:
 *  - GET /api/citas (sin filtros)        -> todas las citas
 *  - GET /api/doctores y /api/terapistas -> nombres de los profesionales
 */
@Component({
    selector: 'app-resumen-agendador',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './resumen-agendador.html',
    styleUrls: ['../estilos-agendador.css', './resumen-agendador.css'],
})
export class ResumenAgendador implements OnInit {
    private readonly agendadorService = inject(AgendadorService);
    private readonly citasService = inject(CitasService);
    private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

    readonly hoy = this.formatoISO(new Date());
    readonly textoHoy = this.capitalizar(
        new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    );

    readonly cargando = signal(true);
    readonly mensajeError = signal('');
    readonly citas = signal<CitaAgendadorItem[]>([]);
    private readonly nombres = signal<Map<string, string>>(new Map());

    // ---------- Datos calculados ----------

    /** Citas de hoy (todas, incluso canceladas), ordenadas por hora. */
    readonly agendaHoy = computed(() =>
        this.citas()
            .filter((c) => c.fecha === this.hoy)
            .sort((a, b) => a.hora.localeCompare(b.hora))
    );

    /** Citas de hoy que siguen en pie (sin canceladas). */
    readonly activasHoy = computed(() => this.agendaHoy().filter((c) => !this.esCancelada(c)));

    readonly canceladasHoy = computed(() => this.agendaHoy().length - this.activasHoy().length);

    /** Citas futuras (desde hoy) que siguen en estado PENDIENTE. */
    readonly pendientes = computed(
        () => this.citas().filter((c) => c.fecha >= this.hoy && c.estado?.toUpperCase() === 'PENDIENTE').length
    );

    /** Citas de mañana a 7 días, sin canceladas. */
    readonly proximosDias = computed(() => {
        const limite = new Date();
        limite.setDate(limite.getDate() + DIAS_PROXIMOS);
        const fechaLimite = this.formatoISO(limite);
        return this.citas().filter(
            (c) => c.fecha > this.hoy && c.fecha <= fechaLimite && !this.esCancelada(c)
        ).length;
    });

    /** Cuántas citas (sin canceladas) tiene hoy cada profesional. */
    readonly porProfesionalHoy = computed<ConteoProfesional[]>(() => {
        const conteo = new Map<string, number>();
        for (const cita of this.activasHoy()) {
            conteo.set(cita.medicoId, (conteo.get(cita.medicoId) ?? 0) + 1);
        }
        const maximo = Math.max(1, ...conteo.values());
        return [...conteo.entries()]
            .map(([medicoId, cantidad]) => ({
                medicoId,
                nombre: this.nombreProfesionalPorId(medicoId),
                cantidad,
                porcentaje: Math.round((cantidad / maximo) * 100),
            }))
            .sort((a, b) => b.cantidad - a.cantidad);
    });

    ngOnInit(): void {
        if (!this.esNavegador) {
            return;
        }
        this.cargar();
    }

    cargar(): void {
        this.cargando.set(true);
        this.mensajeError.set('');

        forkJoin({
            listado: this.agendadorService.listarCitas(),
            profesionales: this.citasService.obtenerDoctores().pipe(catchError(() => of<Doctor[]>([]))),
        }).subscribe({
            next: ({ listado, profesionales }) => {
                this.nombres.set(
                    new Map<string, string>(profesionales.map((p): [string, string] => [p.id, p.nombre]))
                );
                this.citas.set(listado.citas ?? []);
                this.cargando.set(false);
            },
            error: (err) => {
                console.error('Error al cargar el resumen:', err);
                this.mensajeError.set(err?.error?.message ?? 'No se pudo cargar el resumen de citas.');
                this.cargando.set(false);
            },
        });
    }

    // ---------- Formatos ----------

    /** Nombre real del profesional (por id); si no aparece, lo que mande la cita. */
    nombreProfesional(cita: CitaAgendadorItem): string {
        return this.nombres().get(cita.medicoId) ?? cita.medicoNombre ?? cita.medicoId;
    }

    nombrePaciente(cita: CitaAgendadorItem): string {
        return cita.pacienteNombre || cita.pacienteId;
    }

    claseEstado(estado: string): string {
        return 'badge-estado--' + (estado ?? '').toLowerCase();
    }

    textoEstado(estado: string): string {
        const e = (estado ?? '').toLowerCase();
        return e.charAt(0).toUpperCase() + e.slice(1);
    }

    formatearHora(hora: string): string {
        const [h, m] = hora.split(':');
        const horaNum = parseInt(h, 10);
        const ampm = horaNum >= 12 ? 'p. m.' : 'a. m.';
        const hora12 = horaNum % 12 === 0 ? 12 : horaNum % 12;
        return `${hora12}:${m} ${ampm}`;
    }

    private nombreProfesionalPorId(medicoId: string): string {
        const nombre = this.nombres().get(medicoId);
        if (nombre) return nombre;
        const cita = this.citas().find((c) => c.medicoId === medicoId);
        return cita?.medicoNombre ?? medicoId;
    }

    private esCancelada(cita: CitaAgendadorItem): boolean {
        return cita.estado?.toUpperCase() === 'CANCELADA';
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