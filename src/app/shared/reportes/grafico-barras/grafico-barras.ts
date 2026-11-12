import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  SimpleChanges,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';

/**
 * Decisión de arquitectura (Fase 3 / A1 — Plan B):
 * Se utiliza `chart.js` directamente en lugar de `ng2-charts` porque el proyecto usa
 * `@angular/core ^22.1.0` y `typescript ~6.0.2` sin `@angular/cdk` instalado,
 * evitando conflictos de `peerDependencies` sin recurrir a `--legacy-peer-deps`.
 *
 * Seguridad SSR: el `<canvas>` solo se instancia en navegador mediante `afterNextRender`
 * y guarda de `isPlatformBrowser`, y se libera en `ngOnDestroy` con `chart.destroy()`.
 */
@Component({
  selector: 'app-grafico-barras',
  standalone: true,
  templateUrl: './grafico-barras.html',
  styleUrl: './grafico-barras.css',
})
export class GraficoBarras implements OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly esNavegador = isPlatformBrowser(this.platformId);

  readonly lienzo = viewChild<ElementRef<HTMLCanvasElement>>('lienzo');

  @Input() datos: ChartData<'bar'> = { labels: [], datasets: [] };
  @Input() opciones: ChartOptions<'bar'> = {};
  @Input() ariaLabel = 'Gráfico de barras';

  private chart: Chart<'bar'> | null = null;
  private static registrado = false;

  constructor() {
    afterNextRender(() => {
      this.inicializarGrafico();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.chart) {
      return;
    }
    if (changes['datos']) {
      this.chart.data = this.datos;
    }
    if (changes['opciones'] && this.opciones) {
      this.chart.options = {
        responsive: true,
        maintainAspectRatio: false,
        ...this.opciones,
      };
    }
    this.chart.update();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private inicializarGrafico(): void {
    if (!this.esNavegador) {
      return;
    }

    const canvas = this.lienzo()?.nativeElement;
    if (!canvas) {
      return;
    }

    const contexto = canvas.getContext?.('2d');
    if (!contexto) {
      return;
    }

    if (!GraficoBarras.registrado) {
      Chart.register(...registerables);
      GraficoBarras.registrado = true;
    }

    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: this.datos,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...this.opciones,
      },
    });
  }
}
