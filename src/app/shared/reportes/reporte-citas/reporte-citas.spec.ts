import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Auth } from '../../../core/services/auth';
import {
  ReporteCitasQuery,
  ReporteCitasResponse,
  ReporteCitasService,
} from '../../../core/services/reporte-citas';
import { ReporteCitasComponent } from './reporte-citas';

describe('ReporteCitasComponent', () => {
  let consultas: ReporteCitasQuery[];
  let rolActual: string | null;
  let respuesta$: ReturnType<ReporteCitasService['obtenerCitasPorMes']>;

  const respuestaConDatos: ReporteCitasResponse = {
    anio: new Date().getFullYear(),
    tipo: 'POR_MES',
    medicoIdFiltro: null,
    estadosIncluidos: ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA'],
    totalCitas: 3,
    meses: [
      { mes: 1, etiqueta: 'Ene' },
      { mes: 2, etiqueta: 'Feb' },
      { mes: 3, etiqueta: 'Mar' },
      { mes: 4, etiqueta: 'Abr' },
      { mes: 5, etiqueta: 'May' },
      { mes: 6, etiqueta: 'Jun' },
      { mes: 7, etiqueta: 'Jul' },
      { mes: 8, etiqueta: 'Ago' },
      { mes: 9, etiqueta: 'Sep' },
      { mes: 10, etiqueta: 'Oct' },
      { mes: 11, etiqueta: 'Nov' },
      { mes: 12, etiqueta: 'Dic' },
    ],
    series: [
      {
        medicoId: 'doc-4',
        medicoNombre: 'Dra. Ibis González - Cardiología',
        tipoProfesional: 'MEDICO',
        totalAnual: 3,
        porMes: [
          { mes: 1, cantidad: 2 },
          { mes: 2, cantidad: 1 },
          { mes: 3, cantidad: 0 },
          { mes: 4, cantidad: 0 },
          { mes: 5, cantidad: 0 },
          { mes: 6, cantidad: 0 },
          { mes: 7, cantidad: 0 },
          { mes: 8, cantidad: 0 },
          { mes: 9, cantidad: 0 },
          { mes: 10, cantidad: 0 },
          { mes: 11, cantidad: 0 },
          { mes: 12, cantidad: 0 },
        ],
      },
    ],
  };

  function crearComponente(): ComponentFixture<ReporteCitasComponent> {
    TestBed.configureTestingModule({
      imports: [ReporteCitasComponent],
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            getRole: () => rolActual,
          },
        },
        {
          provide: ReporteCitasService,
          useValue: {
            obtenerProfesionales: () =>
              of([
                { id: 'doc-4', nombre: 'Dra. Ibis González - Cardiología', activo: true },
                { id: 'ter-001', nombre: 'Dra. Ana Terapista', activo: true },
              ]),
            obtenerCitasPorMes: (query: ReporteCitasQuery) => {
              consultas.push(query);
              return respuesta$;
            },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(ReporteCitasComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    consultas = [];
    rolActual = 'MEDICO';
    respuesta$ = of(respuestaConDatos);
  });

  it('inicia el formulario con el año actual, tipo POR_MES y ejecuta precarga inicial', () => {
    const fixture = crearComponente();
    const componente = fixture.componentInstance;

    expect(componente.formulario.getRawValue()).toEqual({
      tipo: 'POR_MES',
      medicoId: '',
      anio: new Date().getFullYear(),
    });
    expect(consultas.length).toBe(1);
    expect(consultas[0]).toEqual({
      anio: new Date().getFullYear(),
      medicoId: '',
      tipo: 'POR_MES',
    });

    const opcionDoctor: HTMLOptionElement | null = fixture.nativeElement.querySelector(
      'option[value="POR_DOCTOR"]'
    );
    expect(opcionDoctor?.disabled).toBe(true);
    expect(opcionDoctor?.title).toBe('Próximamente');
  });

  it('no dispara consulta al cambiar filtros hasta hacer clic en Buscar', () => {
    const fixture = crearComponente();
    const componente = fixture.componentInstance;

    expect(consultas.length).toBe(1);

    componente.formulario.patchValue({ anio: 2025, medicoId: 'doc-4' });
    fixture.detectChanges();
    expect(consultas.length).toBe(1);

    const botonBuscar: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    botonBuscar.click();
    fixture.detectChanges();

    expect(consultas.length).toBe(2);
    expect(consultas[1]).toEqual({ anio: 2025, medicoId: 'doc-4', tipo: 'POR_MES' });
  });

  it('muestra alerta informativa cuando no hay datos en el año consultado', () => {
    respuesta$ = of({ ...respuestaConDatos, totalCitas: 0, series: [] });
    const fixture = crearComponente();

    expect(fixture.componentInstance.sinDatos()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No se encontraron citas registradas');
  });

  it('muestra alerta de error si el backend responde error', async () => {
    respuesta$ = throwError(
      () => new HttpErrorResponse({ status: 400, error: { message: 'El año debe estar entre 2000 y 2100' } })
    );
    const fixture = crearComponente();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.mensajeError()).toBe('El año debe estar entre 2000 y 2100');
  });

  it('al hacer clic en Cerrar navega a la ruta inicial según el rol (MEDICO, THERAPIST, ADMIN)', () => {
    const fixture = crearComponente();
    const router = TestBed.inject(Router);
    const rutasNavegadas: string[] = [];
    router.navigateByUrl = ((url: string) => {
      rutasNavegadas.push(url);
      return Promise.resolve(true);
    }) as Router['navigateByUrl'];

    const botonCerrar: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-cerrar');

    rolActual = 'MEDICO';
    botonCerrar.click();

    rolActual = 'THERAPIST';
    botonCerrar.click();

    rolActual = 'ADMIN';
    botonCerrar.click();

    expect(rutasNavegadas).toEqual([
      '/medico/historial',
      '/terapista/historial',
      '/admin/resumen',
    ]);
  });
});
