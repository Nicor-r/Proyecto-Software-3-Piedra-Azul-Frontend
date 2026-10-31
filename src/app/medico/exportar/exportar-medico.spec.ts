import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { ExportarMedico, MENSAJES_EXPORTAR } from './exportar-medico';
import { ArchivoDescargado, MedicoService } from '../../core/services/medico';

describe('ExportarMedico', () => {
    let solicitudes: { fecha: string; estado?: string }[];
    let descargados: ArchivoDescargado[];
    let exportar$: Observable<ArchivoDescargado>;

    const archivoCsv: ArchivoDescargado = {
        nombre: 'citas_Dra_Ibis_Gonzalez_Cardiologia_2026-10-30.csv',
        contenido: new Blob(['Hora;Paciente']),
    };

    /** Simula el error del backend tal como llega en una descarga: JSON dentro de un Blob. */
    function errorDelBackend(mensaje: string): HttpErrorResponse {
        const cuerpo = new Blob([JSON.stringify({ message: mensaje })], { type: 'application/json' });
        return new HttpErrorResponse({ status: 400, error: cuerpo });
    }

    function crearComponente(): ComponentFixture<ExportarMedico> {
        TestBed.configureTestingModule({
            imports: [ExportarMedico],
            providers: [
                {
                    provide: MedicoService,
                    useValue: {
                        obtenerPerfil: () => of({ doctorId: 'doc-4', nombre: 'Dra. Ibis González - Cardiología' }),
                        exportarCitas: (fecha: string, estado?: string) => {
                            solicitudes.push({ fecha, estado });
                            return exportar$;
                        },
                    },
                },
            ],
        });
        const fixture = TestBed.createComponent(ExportarMedico);
        // En las pruebas no descargamos de verdad: solo anotamos qué se descargaría
        fixture.componentInstance.descargarArchivo = (archivo) => descargados.push(archivo);
        fixture.detectChanges();
        return fixture;
    }

    /** Llena el formulario, presiona Exportar, espera y devuelve el texto de la pantalla. */
    async function exportarCon(fixture: ComponentFixture<ExportarMedico>, fecha: string, estado = 'TODOS') {
        fixture.componentInstance.formulario.setValue({ fecha, estado });
        await fixture.componentInstance.exportar();
        fixture.detectChanges();
        return fixture.nativeElement.textContent as string;
    }

    beforeEach(() => {
        solicitudes = [];
        descargados = [];
        exportar$ = of(archivoCsv);
    });

    it('muestra el nombre del medico (fijo) obtenido del perfil', () => {
        const fixture = crearComponente();
        const campoMedico: HTMLInputElement = fixture.nativeElement.querySelector('#medico');

        expect(campoMedico.value).toBe('Dra. Ibis González - Cardiología');
    });

    it('HU-4 escenario 3: sin fecha no consulta y muestra el mensaje', async () => {
        const texto = await exportarCon(crearComponente(), '');

        expect(solicitudes.length).toBe(0);
        expect(texto).toContain(MENSAJES_EXPORTAR.filtroIncompleto);
    });

    it('HU-4 escenario 1: descarga el archivo con el nombre del backend y muestra el exito', async () => {
        const texto = await exportarCon(crearComponente(), '2026-10-30');

        expect(solicitudes).toEqual([{ fecha: '2026-10-30', estado: 'TODOS' }]);
        expect(descargados[0].nombre).toBe('citas_Dra_Ibis_Gonzalez_Cardiologia_2026-10-30.csv');
        expect(texto).toContain('Se descargó el archivo citas_Dra_Ibis_Gonzalez_Cardiologia_2026-10-30.csv');
    });

    it('HU-4.1 escenario 1: envia el estado seleccionado', async () => {
        await exportarCon(crearComponente(), '2026-10-30', 'CONFIRMADA');

        expect(solicitudes).toEqual([{ fecha: '2026-10-30', estado: 'CONFIRMADA' }]);
    });

    it('HU-4 escenario 2: muestra el mensaje del backend y no descarga nada', async () => {
        const mensaje = 'No hay citas para exportar en la fecha y médico/terapista seleccionados';
        exportar$ = throwError(() => errorDelBackend(mensaje));

        const texto = await exportarCon(crearComponente(), '2026-12-25');

        expect(descargados.length).toBe(0);
        expect(texto).toContain(mensaje);
    });

    it('HU-4.1 escenario 3 y HU-4 escenario 4: muestran el mensaje que envia el backend', async () => {
        exportar$ = throwError(() => errorDelBackend('No hay citas con el estado seleccionado para exportar'));
        const fixture = crearComponente();
        expect(await exportarCon(fixture, '2026-10-30', 'CANCELADA'))
            .toContain('No hay citas con el estado seleccionado para exportar');

        exportar$ = throwError(() => errorDelBackend('El médico/terapista seleccionado no está disponible'));
        expect(await exportarCon(fixture, '2026-10-30'))
            .toContain('El médico/terapista seleccionado no está disponible');
    });
});