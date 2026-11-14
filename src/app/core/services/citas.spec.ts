import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CitasService } from './citas';
import { environment } from '../../../environments/environment';

describe('CitasService', () => {
  const API = `${environment.apiUrl}/citas`;
  let service: CitasService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CitasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('obtenerHistorialPaciente hace GET a /citas/paciente/{cedula}', () => {
    service.obtenerHistorialPaciente('1061000001').subscribe((citas) => {
      expect(citas.length).toBe(1);
      expect(citas[0].medicoNombre).toBe('Dra. Ana Terapista - Terapia Física');
    });

    const req = httpMock.expectOne(`${API}/paciente/1061000001`);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 1,
        pacienteId: 'ana.ruiz@gmail.com',
        medicoId: 'ter-001',
        fecha: '2026-11-03',
        hora: '10:00:00',
        estado: 'CONFIRMADA',
        pacienteNombre: 'Ana Ruiz',
        medicoNombre: 'Dra. Ana Terapista - Terapia Física',
      },
    ]);
  });

  it('sugerirPacientes hace GET a /citas/pacientes/sugerencias con parametro cedula', () => {
    service.sugerirPacientes('106').subscribe((sugerencias) => {
      expect(sugerencias.length).toBe(1);
      expect(sugerencias[0].nombreCompleto).toBe('Ana Ruiz');
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${API}/pacientes/sugerencias` && r.params.get('cedula') === '106'
    );
    expect(req.request.method).toBe('GET');
    req.flush([{ cedula: '1061000001', nombreCompleto: 'Ana Ruiz' }]);
  });
});
