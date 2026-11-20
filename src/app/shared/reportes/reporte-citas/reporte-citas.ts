import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ChartData, ChartOptions } from 'chart.js';
import { Auth } from '../../../core/services/auth';
import {
  MedicoOpcion,
  ReporteCitasResponse,
  ReporteCitasService,
  TipoReporteCitas,
  obtenerColorMedico,
} from '../../../core/services/reporte-citas';
import { leerMensajeDeError } from '../../../medico/leer-mensaje-error';
import { GraficoBarras } from '../grafico-barras/grafico-barras';

const ETIQUETAS_MESES_DEFECTO = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

@Component({
  selector: 'app-reporte-citas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GraficoBarras],
  templateUrl: './reporte-citas.html',
  styleUrls: ['../../../medico/estilos-medico.css', './reporte-citas.css'],
})
export class ReporteCitasComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly reporteService = inject(ReporteCitasService);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly anioActual = new Date().getFullYear();

  readonly formulario = this.fb.nonNullable.group({
    tipo: ['POR_MES' as TipoReporteCitas, Validators.required],
    medicoId: [''],
    anio: [this.anioActual, [Validators.required, Validators.min(2000), Validators.max(2100)]],
  });

  readonly profesionales = signal<MedicoOpcion[]>([]);
  readonly cargando = signal(false);
  readonly mensajeError = signal('');
  readonly sinDatos = signal(false);
  readonly anioMostrado = signal<number>(this.anioActual);
  readonly datosGrafico = signal<ChartData<'bar'> | null>(null);

  readonly opcionesGrafico: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
        title: {
          display: true,
          text: 'Cantidad',
        },
      },
    },
  };

  get anio() {
    return this.formulario.controls.anio;
  }

  ngOnInit(): void {
    if (!this.esNavegador) {
      return;
    }
    this.cargarProfesionales();
    this.ejecutarConsulta(this.anioActual, '', 'POR_MES');
  }

  anioInvalido(): boolean {
    return this.anio.touched && this.anio.invalid;
  }

  mensajeAnio(): string {
    if (!this.anioInvalido()) {
      return '';
    }
    if (this.anio.hasError('required')) {
      return 'El año es obligatorio';
    }
    return 'El año debe estar entre 2000 y 2100';
  }

  buscar(): void {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) {
      return;
    }
    const { anio, medicoId, tipo } = this.formulario.getRawValue();
    this.ejecutarConsulta(Number(anio), medicoId, tipo);
  }

  cerrar(): void {
    const rol = this.auth.getRole();
    let rutaDestino = '/';

    if (rol === 'MEDICO') {
      rutaDestino = '/medico/historial';
    } else if (rol === 'THERAPIST') {
      rutaDestino = '/terapista/historial';
    } else if (rol === 'ADMIN') {
      rutaDestino = '/admin/resumen';
    } else if (this.router.url.startsWith('/medico')) {
      rutaDestino = '/medico/historial';
    } else if (this.router.url.startsWith('/terapista')) {
      rutaDestino = '/terapista/historial';
    } else if (this.router.url.startsWith('/admin')) {
      rutaDestino = '/admin/resumen';
    }

    this.router.navigateByUrl(rutaDestino);
  }

  private cargarProfesionales(): void {
    this.reporteService.obtenerProfesionales().subscribe({
      next: (lista) => this.profesionales.set(lista),
      error: () => this.profesionales.set([]),
    });
  }

  private ejecutarConsulta(anio: number, medicoId: string, tipo: TipoReporteCitas): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    this.sinDatos.set(false);

    this.reporteService.obtenerCitasPorMes({ anio, medicoId, tipo }).subscribe({
      next: (resp) => {
        this.anioMostrado.set(resp.anio);
        if (!resp.series || resp.series.length === 0 || resp.totalCitas === 0) {
          this.datosGrafico.set(null);
          this.sinDatos.set(true);
        } else {
          this.datosGrafico.set(this.construirDatosGrafico(resp));
          this.sinDatos.set(false);
        }
        this.cargando.set(false);
      },
      error: async (error) => {
        this.datosGrafico.set(null);
        this.sinDatos.set(false);
        this.mensajeError.set(
          await leerMensajeDeError(
            error,
            'Ocurrió un error al consultar el reporte de citas. Intenta de nuevo.'
          )
        );
        this.cargando.set(false);
      },
    });
  }

  private construirDatosGrafico(resp: ReporteCitasResponse): ChartData<'bar'> {
    const labels =
      resp.meses && resp.meses.length > 0
        ? resp.meses.map((m) => m.etiqueta)
        : ETIQUETAS_MESES_DEFECTO;

    const datasets = resp.series.map((serie) => {
      const color = obtenerColorMedico(serie.medicoId);
      return {
        label: serie.medicoNombre,
        data: serie.porMes.map((dato) => dato.cantidad),
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 4,
      };
    });

    return { labels, datasets };
  }
}
