import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartData, ChartOptions } from 'chart.js';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { DoctorResponse, ScheduleConfigService } from '../../core/services/schedule-config';
import {
  ReporteCitasResponse,
  ReporteCitasRow,
  ReporteCitasService,
} from '../../core/services/reporte-citas';
import { GraficoBarras } from '../../shared/reportes/grafico-barras/grafico-barras';

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Resultado de revisar los profesionales y si ya tienen agenda configurada. */
interface EstadoProfesionales {
  doctores: DoctorResponse[];
  sinAgenda: DoctorResponse[];
}

/**
 * Panel "Resumen" del administrador.
 * Solo LEE información que el backend ya expone:
 *  - GET /api/admin/doctors                -> profesionales y su estado
 *  - GET /api/admin/schedule-config/{id}   -> si cada profesional activo tiene agenda
 *  - GET /api/reportes/citas-por-mes       -> citas del año, por mes y por profesional
 */
@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [CommonModule, RouterLink, GraficoBarras],
  templateUrl: './resumen.html',
  styleUrl: './resumen.css',
})
export class Resumen implements OnInit {
  private readonly scheduleService = inject(ScheduleConfigService);
  private readonly reporteService = inject(ReporteCitasService);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly hoy = new Date();
  readonly anioActual = this.hoy.getFullYear();
  readonly indiceMesActual = this.hoy.getMonth(); // 0 = enero
  readonly nombreMesActual = MESES_LARGOS[this.indiceMesActual];

  // ---- Estado de la pantalla ----
  readonly cargando = signal(true);
  readonly doctores = signal<DoctorResponse[]>([]);
  readonly sinAgenda = signal<DoctorResponse[]>([]);
  readonly reporte = signal<ReporteCitasResponse | null>(null);
  readonly errorProfesionales = signal('');
  readonly errorCitas = signal('');

  // ---- Números calculados a partir del estado ----
  readonly totalActivos = computed(() => this.doctores().filter((d) => d.activo).length);
  readonly totalInactivos = computed(() => this.doctores().length - this.totalActivos());

  /** Suma, mes a mes, las citas de todos los profesionales. */
  readonly citasPorMes = computed<number[]>(() => {
    const totales = new Array<number>(12).fill(0);
    for (const serie of this.reporte()?.series ?? []) {
      (serie.porMes ?? []).forEach((dato, i) => {
        if (i < 12) {
          totales[i] += dato.cantidad ?? 0;
        }
      });
    }
    return totales;
  });

  readonly citasAnio = computed(() => this.reporte()?.totalCitas ?? 0);
  readonly citasMesActual = computed(() => this.citasPorMes()[this.indiceMesActual] ?? 0);

  /** Los 3 profesionales con más citas en el año. */
  readonly topProfesionales = computed<ReporteCitasRow[]>(() =>
    [...(this.reporte()?.series ?? [])]
      .filter((s) => s.totalAnual > 0)
      .sort((a, b) => b.totalAnual - a.totalAnual)
      .slice(0, 3)
  );

  readonly datosGrafico = computed<ChartData<'bar'>>(() => {
    const meses = this.reporte()?.meses;
    return {
      labels: meses && meses.length > 0 ? meses.map((m) => m.etiqueta) : MESES_CORTOS,
      datasets: [
        {
          label: `Citas ${this.anioActual}`,
          data: this.citasPorMes(),
          backgroundColor: '#0d3b66',
          borderRadius: 4,
        },
      ],
    };
  });

  readonly opcionesGrafico: ChartOptions<'bar'> = {
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  ngOnInit(): void {
    // El token vive en el navegador: no se consulta nada durante el renderizado en servidor.
    if (!this.esNavegador) {
      return;
    }
    this.cargarResumen();
  }

  textoTipo(tipo: ReporteCitasRow['tipoProfesional']): string {
    if (tipo === 'MEDICO') return 'Médico';
    if (tipo === 'TERAPISTA') return 'Terapista';
    return 'Profesional';
  }

  private cargarResumen(): void {
    this.cargando.set(true);
    this.errorProfesionales.set('');
    this.errorCitas.set('');

    // Cada parte maneja su propio error: si una falla, la otra igual se muestra.
    forkJoin({
      profesionales: this.revisarProfesionales(),
      reporte: this.reporteService
        .obtenerCitasPorMes({ anio: this.anioActual, tipo: 'POR_MES' })
        .pipe(
          catchError(() => {
            this.errorCitas.set('No se pudo cargar la información de citas.');
            return of(null);
          })
        ),
    }).subscribe(({ profesionales, reporte }) => {
      if (profesionales) {
        this.doctores.set(profesionales.doctores);
        this.sinAgenda.set(profesionales.sinAgenda);
      }
      this.reporte.set(reporte);
      this.cargando.set(false);
    });
  }

  /** Trae los profesionales y pregunta, por cada activo, si ya tiene agenda guardada. */
  private revisarProfesionales() {
    return this.scheduleService.listarDoctores().pipe(
      switchMap((doctores) => {
        const activos = doctores.filter((d) => d.activo);
        if (activos.length === 0) {
          return of<EstadoProfesionales>({ doctores, sinAgenda: [] });
        }
        const consultas = activos.map((doctor) =>
          this.scheduleService.obtenerConfiguracion(doctor.id).pipe(
            // obtenerConfiguracion devuelve null cuando el doctor no tiene agenda (404)
            map((config) => ({ doctor, tieneAgenda: config !== null })),
            // Si la consulta falla por otro motivo, no lo marcamos como pendiente
            catchError(() => of({ doctor, tieneAgenda: true }))
          )
        );
        return forkJoin(consultas).pipe(
          map(
            (resultados): EstadoProfesionales => ({
              doctores,
              sinAgenda: resultados.filter((r) => !r.tieneAgenda).map((r) => r.doctor),
            })
          )
        );
      }),
      catchError(() => {
        this.errorProfesionales.set('No se pudo cargar la información de los profesionales.');
        return of(null);
      })
    );
  }
}