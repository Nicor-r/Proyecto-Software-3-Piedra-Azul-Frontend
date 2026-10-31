import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MedicoService } from './medico';
import { environment } from '../../../environments/environment';

describe('MedicoService', () => {
  const API = `${environment.apiUrl}/medico`;
  let service: MedicoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MedicoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verifica que no quedaron peticiones sin revisar
    httpMock.verify();
  });

  it('obtenerPerfil hace GET a /medico/perfil', () => {
    service.obtenerPerfil().subscribe((perfil) => {
      expect(perfil.doctorId).toBe('doc-4');
    });

    const req = httpMock.expectOne(`${API}/perfil`);
    expect(req.request.method).toBe('GET');
    req.flush({ doctorId: 'doc-4', nombre: 'Dra. Ibis González - Cardiología' });
  });

  it('consultarHistorial envia la cedula como parametro', () => {
    service.consultarHistorial('1061000001').subscribe((historial) => {
      expect(historial.total).toBe(0);
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${API}/historial` && r.params.get('cedula') === '1061000001'
    );
    req.flush({ cedula: '1061000001', nombrePaciente: 'Ana Ruiz', total: 0, citas: [] });
  });

  it('sugerirPacientes envia la cedula parcial como parametro', () => {
    service.sugerirPacientes('106').subscribe((sugerencias) => {
      expect(sugerencias.length).toBe(1);
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${API}/pacientes/sugerencias` && r.params.get('cedula') === '106'
    );
    req.flush([{ cedula: '1061000001', nombreCompleto: 'Ana Ruiz' }]);
  });

  it('exportarCitas envia fecha y estado y lee el nombre del archivo del encabezado', () => {
    service.exportarCitas('2026-10-30', 'CONFIRMADA').subscribe((archivo) => {
      expect(archivo.nombre).toBe('citas_Dra_Ibis_Gonzalez_Cardiologia_2026-10-30.csv');
      expect(archivo.contenido).toBeInstanceOf(Blob);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${API}/citas/exportar` &&
        r.params.get('fecha') === '2026-10-30' &&
        r.params.get('estado') === 'CONFIRMADA'
    );
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['Hora;Paciente']), {
      headers: { 'Content-Disposition': 'attachment; filename="citas_Dra_Ibis_Gonzalez_Cardiologia_2026-10-30.csv"' },
    });
  });

  it('exportarCitas con TODOS no envia el parametro estado', () => {
    service.exportarCitas('2026-10-30', 'TODOS').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API}/citas/exportar`);
    expect(req.request.params.has('estado')).toBe(false);
    req.flush(new Blob(['x']));
  });

  it('exportarCitas sin encabezado Content-Disposition usa un nombre por defecto', () => {
    service.exportarCitas('2026-10-30').subscribe((archivo) => {
      expect(archivo.nombre).toBe('citas_2026-10-30.csv');
    });

    const req = httpMock.expectOne((r) => r.url === `${API}/citas/exportar`);
    req.flush(new Blob(['x']));
  });
});