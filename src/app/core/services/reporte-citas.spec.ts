import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import {
  PALETA_COLORES_REPORTES,
  ReporteCitasResponse,
  ReporteCitasService,
  obtenerColorMedico,
} from './reporte-citas';

describe('ReporteCitasService', () => {
  const API_REPORTES = `${environment.apiUrl}/reportes`;
  let service: ReporteCitasService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReporteCitasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('obtenerCitasPorMes envia anio y tipo sin medicoId cuando no se especifica', () => {
    const respuestaMock: ReporteCitasResponse = {
      anio: 2025,
      tipo: 'POR_MES',
      medicoIdFiltro: null,
      estadosIncluidos: ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA'],
      totalCitas: 5,
      meses: [{ mes: 1, etiqueta: 'Ene' }],
      series: [],
    };

    service.obtenerCitasPorMes({ anio: 2025, tipo: 'POR_MES' }).subscribe((resp) => {
      expect(resp.anio).toBe(2025);
      expect(resp.totalCitas).toBe(5);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${API_REPORTES}/citas-por-mes` &&
        r.params.get('anio') === '2025' &&
        r.params.get('tipo') === 'POR_MES' &&
        !r.params.has('medicoId')
    );
    expect(req.request.method).toBe('GET');
    req.flush(respuestaMock);
  });

  it('obtenerCitasPorMes omite medicoId si viene vacío o solo con espacios', () => {
    service.obtenerCitasPorMes({ anio: 2026, medicoId: '   ', tipo: 'POR_MES' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_REPORTES}/citas-por-mes`);
    expect(req.request.params.has('medicoId')).toBe(false);
    req.flush({
      anio: 2026,
      tipo: 'POR_MES',
      medicoIdFiltro: null,
      estadosIncluidos: ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA'],
      totalCitas: 0,
      meses: [],
      series: [],
    });
  });

  it('obtenerCitasPorMes incluye medicoId recortado cuando se selecciona un profesional', () => {
    service
      .obtenerCitasPorMes({ anio: 2025, medicoId: ' ter-001 ', tipo: 'POR_MES' })
      .subscribe((resp) => {
        expect(resp.medicoIdFiltro).toBe('ter-001');
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${API_REPORTES}/citas-por-mes` &&
        r.params.get('anio') === '2025' &&
        r.params.get('medicoId') === 'ter-001' &&
        r.params.get('tipo') === 'POR_MES'
    );
    req.flush({
      anio: 2025,
      tipo: 'POR_MES',
      medicoIdFiltro: 'ter-001',
      estadosIncluidos: ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA'],
      totalCitas: 0,
      meses: [],
      series: [],
    });
  });

  it('obtenerProfesionales unifica doctores y terapistas', () => {
    service.obtenerProfesionales().subscribe((lista) => {
      expect(lista.length).toBe(2);
      expect(lista[0].id).toBe('doc-4');
      expect(lista[1].id).toBe('ter-001');
    });

    const reqDoctores = httpMock.expectOne(`${environment.apiUrl}/doctores`);
    const reqTerapistas = httpMock.expectOne(`${environment.apiUrl}/terapistas`);

    reqDoctores.flush([{ id: 'doc-4', nombre: 'Dra. Ibis González - Cardiología', activo: true }]);
    reqTerapistas.flush([{ id: 'ter-001', nombre: 'Dra. Ana Terapista', especialidad: 'Terapia Física' }]);
  });

  it('obtenerColorMedico devuelve colores deterministas dentro de la paleta', () => {
    const c1 = obtenerColorMedico('doc-4');
    const c2 = obtenerColorMedico('doc-4');
    const c3 = service.obtenerColor('ter-001');

    expect(c1).toBe(c2);
    expect(PALETA_COLORES_REPORTES).toContain(c1);
    expect(PALETA_COLORES_REPORTES).toContain(c3);
  });
});
