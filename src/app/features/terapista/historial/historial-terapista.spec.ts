import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ESPERA_SUGERENCIAS_MS, HistorialTerapista, MENSAJES_HISTORIAL } from './historial-terapista';
import { Cita, CitasService, PacienteSugerencia } from '../../../core/services/citas';

describe('HistorialTerapista', () => {
  let cedulasConsultadas: string[];
  let prefijosSugeridos: string[];
  let respuesta$: Observable<Cita[]>;
  let sugerencias$: Observable<PacienteSugerencia[]>;

  const citasAna: Cita[] = [
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
    {
      id: 2,
      pacienteId: 'ana.ruiz@gmail.com',
      medicoId: 'doc-4',
      fecha: '2026-10-30',
      hora: '08:00:00',
      estado: 'PENDIENTE',
      pacienteNombre: 'Ana Ruiz',
      medicoNombre: 'Dra. Ibis González - Cardiología',
    },
  ];

  function crearComponente(): ComponentFixture<HistorialTerapista> {
    TestBed.configureTestingModule({
      imports: [HistorialTerapista],
      providers: [
        {
          provide: CitasService,
          useValue: {
            obtenerHistorialPaciente: (cedula: string) => {
              cedulasConsultadas.push(cedula);
              return respuesta$;
            },
            sugerirPacientes: (prefijo: string) => {
              prefijosSugeridos.push(prefijo);
              return sugerencias$;
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(HistorialTerapista);
    fixture.detectChanges();
    return fixture;
  }

  function buscarCon(fixture: ComponentFixture<HistorialTerapista>, cedula: string): string {
    fixture.componentInstance.formulario.controls.cedula.setValue(cedula);
    fixture.componentInstance.buscar();
    fixture.detectChanges();
    return fixture.nativeElement.textContent as string;
  }

  function escribir(fixture: ComponentFixture<HistorialTerapista>, texto: string): void {
    fixture.componentInstance.formulario.controls.cedula.setValue(texto);
    fixture.componentInstance.alEscribirCedula(texto);
  }

  function esperarSugerencias(fixture: ComponentFixture<HistorialTerapista>): void {
    vi.advanceTimersByTime(ESPERA_SUGERENCIAS_MS);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    cedulasConsultadas = [];
    prefijosSugeridos = [];
    respuesta$ = of(citasAna);
    sugerencias$ = of([
      { cedula: '1061000001', nombreCompleto: 'Ana Ruiz' },
      { cedula: '1061000002', nombreCompleto: 'Marta Gómez' },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cedula vacia no consulta y muestra el mensaje', () => {
    const texto = buscarCon(crearComponente(), '   ');

    expect(cedulasConsultadas.length).toBe(0);
    expect(texto).toContain(MENSAJES_HISTORIAL.cedulaVacia);
  });

  it('muestra paciente, total, formato de fecha/hora y nombre resuelto del terapista/medico', () => {
    const fixture = crearComponente();

    const texto = buscarCon(fixture, '1061000001');

    expect(cedulasConsultadas).toEqual(['1061000001']);
    expect(texto).toContain('Ana Ruiz');
    expect(texto).toContain('Martes 3 de noviembre de 2026');
    expect(texto).toContain('10:00 a. m.');
    expect(texto).toContain('Dra. Ana Terapista - Terapia Física');
    expect(texto).toContain('Dra. Ibis González - Cardiología');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('paciente sin citas muestra total 0 y alerta informativa', () => {
    respuesta$ = of([]);

    const texto = buscarCon(crearComponente(), '1061999001');

    expect(texto).toContain('0');
    expect(texto).toContain(MENSAJES_HISTORIAL.sinCitas);
  });

  it('muestra el mensaje de error devuelto por el backend', async () => {
    const mensajeBackend = 'Paciente no encontrado con identificacion 1061999999';
    respuesta$ = throwError(() => new HttpErrorResponse({ status: 404, error: { message: mensajeBackend } }));

    const fixture = crearComponente();
    fixture.componentInstance.formulario.controls.cedula.setValue('1061999999');
    fixture.componentInstance.buscar();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(mensajeBackend);
  });

  it('con 3 digitos muestra las sugerencias con cedula y nombre', () => {
    const fixture = crearComponente();

    escribir(fixture, '106');
    esperarSugerencias(fixture);

    const items = fixture.nativeElement.querySelectorAll('.sugerencias__item');
    expect(prefijosSugeridos).toEqual(['106']);
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('1061000001');
    expect(items[0].textContent).toContain('Ana Ruiz');
  });

  it('con menos de 3 digitos no consulta al servidor ni muestra sugerencias', () => {
    const fixture = crearComponente();

    escribir(fixture, '10');
    esperarSugerencias(fixture);

    expect(prefijosSugeridos.length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.sugerencias__item').length).toBe(0);
  });

  it('sin coincidencias muestra el mensaje', () => {
    sugerencias$ = of([]);
    const fixture = crearComponente();

    escribir(fixture, '999');
    esperarSugerencias(fixture);

    expect(fixture.nativeElement.textContent).toContain(MENSAJES_HISTORIAL.sinCoincidencias);
  });

  it('al seleccionar una sugerencia completa el campo y consulta el historial', () => {
    const fixture = crearComponente();
    escribir(fixture, '106');
    esperarSugerencias(fixture);

    fixture.nativeElement.querySelector('.sugerencias__item').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.cedula.value).toBe('1061000001');
    expect(cedulasConsultadas).toEqual(['1061000001']);
    expect(fixture.nativeElement.querySelectorAll('.sugerencias__item').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Ana Ruiz');
  });

  it('escribir rapido solo consulta una vez con el ultimo texto (debounce)', () => {
    const fixture = crearComponente();

    escribir(fixture, '1');
    escribir(fixture, '10');
    escribir(fixture, '106');
    esperarSugerencias(fixture);

    expect(prefijosSugeridos).toEqual(['106']);
  });
});
