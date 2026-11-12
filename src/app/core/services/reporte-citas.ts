import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CitasService } from './citas';

export type TipoReporteCitas = 'POR_MES' | 'POR_DOCTOR';

export interface ReporteCitasQuery {
  anio: number;
  medicoId?: string;
  tipo: TipoReporteCitas;
}

export interface MesReporte {
  mes: number;
  etiqueta: string;
}

export interface ReporteCitasMesDato {
  mes: number;
  cantidad: number;
}

export interface ReporteCitasRow {
  medicoId: string;
  medicoNombre: string;
  tipoProfesional: 'MEDICO' | 'TERAPISTA' | 'DESCONOCIDO';
  totalAnual: number;
  porMes: ReporteCitasMesDato[];
}

export interface ReporteCitasResponse {
  anio: number;
  tipo: TipoReporteCitas;
  medicoIdFiltro: string | null;
  estadosIncluidos: string[];
  totalCitas: number;
  meses: MesReporte[];
  /** series puede venir vacío si el año no tiene citas que cuenten */
  series: ReporteCitasRow[];
}

export interface MedicoOpcion {
  id: string;
  nombre: string;
  activo: boolean;
}

export const PALETA_COLORES_REPORTES: readonly string[] = [
  '#17374b', // Azul institucional Piedra Azul
  '#2b7a78', // Verde azulado
  '#d97706', // Ámbar cálido
  '#2563eb', // Azul brillante
  '#dc2626', // Rojo coral
  '#7c3aed', // Violeta
  '#059669', // Esmeralda
  '#db2777', // Magenta
  '#0891b2', // Cian oscuro
  '#65a30d', // Oliva vibrante
  '#ea580c', // Naranja
  '#4f46e5', // Índigo
];

/**
 * Asigna un color determinista a partir del identificador del médico/terapista
 * para que conserve el mismo color entre búsquedas distintas.
 */
export function obtenerColorMedico(medicoId: string): string {
  const clave = (medicoId ?? '').trim();
  let hash = 0;
  for (let i = 0; i < clave.length; i++) {
    hash = (hash * 31 + clave.charCodeAt(i)) >>> 0;
  }
  return PALETA_COLORES_REPORTES[hash % PALETA_COLORES_REPORTES.length];
}

/**
 * Comunicación con el endpoint de reportes (/api/reportes/**).
 * El token JWT se adjunta automáticamente mediante authInterceptor.
 */
@Injectable({
  providedIn: 'root',
})
export class ReporteCitasService {
  private readonly http = inject(HttpClient);
  private readonly citasService = inject(CitasService);
  private readonly apiUrl = `${environment.apiUrl}/reportes`;

  obtenerCitasPorMes(query: ReporteCitasQuery): Observable<ReporteCitasResponse> {
    let params = new HttpParams()
      .set('anio', String(query.anio))
      .set('tipo', query.tipo);

    const medicoId = query.medicoId?.trim();
    if (medicoId) {
      params = params.set('medicoId', medicoId);
    }

    return this.http.get<ReporteCitasResponse>(`${this.apiUrl}/citas-por-mes`, { params });
  }

  obtenerProfesionales(): Observable<MedicoOpcion[]> {
    return this.citasService.obtenerDoctores();
  }

  obtenerColor(medicoId: string): string {
    return obtenerColorMedico(medicoId);
  }
}
