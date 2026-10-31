import { claseEstado, formatearFecha, formatearHora, textoEstado } from './formato-cita';

describe('formato-cita', () => {
    it('formatearFecha muestra dia de la semana, dia, mes y año', () => {
        expect(formatearFecha('2026-10-30')).toBe('Viernes 30 de octubre de 2026');
    });

    it('formatearHora usa formato de 12 horas', () => {
        expect(formatearHora('08:00:00')).toBe('8:00 a. m.');
        expect(formatearHora('14:30:00')).toBe('2:30 p. m.');
        expect(formatearHora('12:00:00')).toBe('12:00 p. m.');
    });

    it('textoEstado y claseEstado traducen el estado a texto y pastilla', () => {
        expect(textoEstado('CONFIRMADA')).toBe('Confirmada');
        expect(claseEstado('PENDIENTE')).toBe('badge-estado badge-estado--pendiente');
    });

    it('valores inesperados se devuelven sin romperse', () => {
        expect(formatearFecha('fecha-mala')).toBe('fecha-mala');
        expect(claseEstado('OTRO')).toBe('badge-estado');
    });
});