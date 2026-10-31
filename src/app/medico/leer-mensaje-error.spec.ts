import { HttpErrorResponse } from '@angular/common/http';
import { leerMensajeDeError } from './leer-mensaje-error';

describe('leerMensajeDeError', () => {
    const POR_DEFECTO = 'Mensaje general';

    it('lee el message de un error que llega empaquetado como Blob (descargas)', async () => {
        const cuerpo = new Blob([JSON.stringify({ message: 'No hay citas para exportar' })], { type: 'application/json' });
        const error = new HttpErrorResponse({ status: 400, error: cuerpo });

        expect(await leerMensajeDeError(error, POR_DEFECTO)).toBe('No hay citas para exportar');
    });

    it('lee el message de un error JSON normal', async () => {
        const error = new HttpErrorResponse({ status: 400, error: { message: 'Médico no disponible' } });

        expect(await leerMensajeDeError(error, POR_DEFECTO)).toBe('Médico no disponible');
    });

    it('si el contenido no es JSON usa el mensaje por defecto', async () => {
        const error = new HttpErrorResponse({ status: 500, error: new Blob(['<html>Error</html>']) });

        expect(await leerMensajeDeError(error, POR_DEFECTO)).toBe(POR_DEFECTO);
    });

    it('si no es un error HTTP usa el mensaje por defecto', async () => {
        expect(await leerMensajeDeError(new Error('otro'), POR_DEFECTO)).toBe(POR_DEFECTO);
    });
});