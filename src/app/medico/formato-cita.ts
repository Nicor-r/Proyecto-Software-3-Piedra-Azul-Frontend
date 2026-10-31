const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const TEXTOS_ESTADO: Record<string, string> = {
    CONFIRMADA: 'Confirmada',
    PENDIENTE: 'Pendiente',
    COMPLETADA: 'Completada',
    CANCELADA: 'Cancelada',
};

/** "2026-10-30" -> "Viernes 30 de octubre de 2026" (el historial abarca varios años). */
export function formatearFecha(fecha: string): string {
    const partes = (fecha ?? '').split('-').map(Number);
    if (partes.length !== 3 || partes.some((parte) => isNaN(parte))) {
        return fecha ?? '';
    }
    const [anio, mes, dia] = partes;
    const diaSemana = new Date(anio, mes - 1, dia).getDay();
    return `${DIAS[diaSemana]} ${dia} de ${MESES[mes - 1]} de ${anio}`;
}

/** "08:00:00" -> "8:00 a. m."  |  "14:30:00" -> "2:30 p. m." */
export function formatearHora(hora: string): string {
    const [h, m] = (hora ?? '').split(':');
    const horaNum = Number(h);
    if (!h || !m || isNaN(horaNum)) {
        return hora ?? '';
    }
    const ampm = horaNum >= 12 ? 'p. m.' : 'a. m.';
    const hora12 = horaNum % 12 === 0 ? 12 : horaNum % 12;
    return `${hora12}:${m} ${ampm}`;
}

/** "CONFIRMADA" -> "Confirmada" */
export function textoEstado(estado: string): string {
    return TEXTOS_ESTADO[(estado ?? '').toUpperCase()] ?? estado;
}

/** "CONFIRMADA" -> "badge-estado badge-estado--confirmada" (pastilla de color). */
export function claseEstado(estado: string): string {
    const mayusculas = (estado ?? '').toUpperCase();
    return TEXTOS_ESTADO[mayusculas]
        ? `badge-estado badge-estado--${mayusculas.toLowerCase()}`
        : 'badge-estado';
}