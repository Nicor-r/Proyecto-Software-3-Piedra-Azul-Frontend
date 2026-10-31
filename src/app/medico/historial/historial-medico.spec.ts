import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ESPERA_SUGERENCIAS_MS, HistorialMedico, MENSAJES_HISTORIAL } from './historial-medico';
import { HistorialPaciente, MedicoService, PacienteSugerencia } from '../../core/services/medico';

describe('HistorialMedico', () => {
    let cedulasConsultadas: string[];
    let prefijosSugeridos: string[];
    let respuesta$: Observable<HistorialPaciente>;
    let sugerencias$: Observable<PacienteSugerencia[]>;

    const historialAna: HistorialPaciente = {
        cedula: '1061000001',
        nombrePaciente: 'Ana Ruiz',
        total: 2,
        citas: [
            { fecha: '2026-11-05', hora: '08:30:00', medicoId: 'doc-1', medicoNombre: 'Dra. Ana Martinez - Medicina General', estado: 'PENDIENTE' },
            { fecha: '2026-10-30', hora: '08:00:00', medicoId: 'doc-4', medicoNombre: 'Dra. Ibis González - Cardiología', estado: 'CONFIRMADA' },
        ],
    };

    function crearComponente(): ComponentFixture<HistorialMedico> {
        TestBed.configureTestingModule({
            imports: [HistorialMedico],
            providers: [
                {
                    provide: MedicoService,
                    useValue: {
                        consultarHistorial: (cedula: string) => {
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
        const fixture = TestBed.createComponent(HistorialMedico);
        fixture.detectChanges();
        return fixture;
    }

    /** Escribe la cédula, presiona Buscar y devuelve el texto de la pantalla. */
    function buscarCon(fixture: ComponentFixture<HistorialMedico>, cedula: string): string {
        fixture.componentInstance.formulario.controls.cedula.setValue(cedula);
        fixture.componentInstance.buscar();
        fixture.detectChanges();
        return fixture.nativeElement.textContent as string;
    }

    /** Simula que el usuario escribe un texto en el campo (sin esperar). */
    function escribir(fixture: ComponentFixture<HistorialMedico>, texto: string): void {
        fixture.componentInstance.formulario.controls.cedula.setValue(texto);
        fixture.componentInstance.alEscribirCedula(texto);
    }

    /** Deja pasar el tiempo del debounce y actualiza la pantalla. */
    function esperarSugerencias(fixture: ComponentFixture<HistorialMedico>): void {
        vi.advanceTimersByTime(ESPERA_SUGERENCIAS_MS);
        fixture.detectChanges();
    }

    beforeEach(() => {
        vi.useFakeTimers();
        cedulasConsultadas = [];
        prefijosSugeridos = [];
        respuesta$ = of(historialAna);
        sugerencias$ = of([
            { cedula: '1061000001', nombreCompleto: 'Ana Ruiz' },
            { cedula: '1061000002', nombreCompleto: 'Marta Gómez' },
        ]);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ---------- HU-5 ----------

    it('HU-5 escenario 4: cedula vacia no consulta y muestra el mensaje', () => {
        const texto = buscarCon(crearComponente(), '   ');

        expect(cedulasConsultadas.length).toBe(0);
        expect(texto).toContain(MENSAJES_HISTORIAL.cedulaVacia);
    });

    it('HU-5 escenario 5: formato invalido no consulta y muestra el mensaje', () => {
        const texto = buscarCon(crearComponente(), '12ab');

        expect(cedulasConsultadas.length).toBe(0);
        expect(texto).toContain(MENSAJES_HISTORIAL.formatoInvalido);
    });

    it('HU-5 escenario 1: muestra nombre, total y una fila por cita', () => {
        const fixture = crearComponente();
        const texto = buscarCon(fixture, '1061000001');

        expect(cedulasConsultadas).toEqual(['1061000001']);
        expect(texto).toContain('Ana Ruiz');
        expect(texto).toContain('Dra. Ibis González - Cardiología');
        expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    });

    it('HU-5 escenario 2: paciente sin citas muestra el mensaje y total 0', () => {
        respuesta$ = of({ cedula: '1061999001', nombrePaciente: 'Paciente Sin Citas', total: 0, citas: [] });

        const texto = buscarCon(crearComponente(), '1061999001');

        expect(texto).toContain('Paciente Sin Citas');
        expect(texto).toContain(MENSAJES_HISTORIAL.sinCitas);
    });

    it('HU-5 escenario 3: muestra el mensaje que envia el backend', () => {
        const mensajeBackend = 'No existe un paciente registrado con la cédula ingresada';
        respuesta$ = throwError(() => new HttpErrorResponse({ status: 400, error: { message: mensajeBackend } }));

        const texto = buscarCon(crearComponente(), '1061999999');

        expect(texto).toContain(mensajeBackend);
    });

    // ---------- HU-5.1 ----------

    it('HU-5.1 escenario 1: con 3 digitos muestra las sugerencias con cedula y nombre', () => {
        const fixture = crearComponente();

        escribir(fixture, '106');
        esperarSugerencias(fixture);

        const items = fixture.nativeElement.querySelectorAll('.sugerencias__item');
        expect(prefijosSugeridos).toEqual(['106']);
        expect(items.length).toBe(2);
        expect(items[0].textContent).toContain('1061000001');
        expect(items[0].textContent).toContain('Ana Ruiz');
    });

    it('HU-5.1 escenario 4: con menos de 3 digitos no consulta al servidor ni muestra sugerencias', () => {
        const fixture = crearComponente();

        escribir(fixture, '10');
        esperarSugerencias(fixture);

        expect(prefijosSugeridos.length).toBe(0);
        expect(fixture.nativeElement.querySelectorAll('.sugerencias__item').length).toBe(0);
    });

    it('HU-5.1 escenario 3: sin coincidencias muestra el mensaje', () => {
        sugerencias$ = of([]);
        const fixture = crearComponente();

        escribir(fixture, '999');
        esperarSugerencias(fixture);

        expect(fixture.nativeElement.textContent).toContain(MENSAJES_HISTORIAL.sinCoincidencias);
    });

    it('HU-5.1 escenario 2: al seleccionar una sugerencia completa el campo y consulta el historial', () => {
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

    it('escribir rapido solo consulta una vez, con el ultimo texto (debounce)', () => {
        const fixture = crearComponente();

        escribir(fixture, '1');
        escribir(fixture, '10');
        escribir(fixture, '106');
        esperarSugerencias(fixture);

        expect(prefijosSugeridos).toEqual(['106']);
    });
});