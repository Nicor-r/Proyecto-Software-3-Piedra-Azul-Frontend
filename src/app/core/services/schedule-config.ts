import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Días de la semana tal como los serializa/deserializa el backend
 * (nombres del enum `java.time.DayOfWeek`).
 */
export type DiaSemana =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface DoctorResponse {
  id: string;
  nombre: string;
  activo: boolean;
}

/** Cuerpo esperado por `PUT /api/admin/schedule-config`. */
export interface ConfiguracionAgendaRequest {
  doctorId: string;
  ventanaSemanas: number;
  diasAtencion: DiaSemana[];
  horaInicio: string; // "HH:mm:ss"
  horaFin: string; // "HH:mm:ss"
  intervaloMinutos: number;
}

/** Respuesta devuelta por el backend al consultar o guardar una configuración. */
export interface ConfiguracionAgendaResponse {
  id: string;
  doctorId: string;
  ventanaSemanas: number;
  diasAtencion: DiaSemana[];
  horaInicio: string;
  horaFin: string;
  intervaloMinutos: number;
}

@Injectable({
  providedIn: 'root',
})
export class ScheduleConfigService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  /** Lista los doctores (médicos/terapistas) registrados, activos e inactivos. */
  listarDoctores(): Observable<DoctorResponse[]> {
    return this.http.get<DoctorResponse[]>(`${this.apiUrl}/doctors`);
  }

  /**
   * Consulta la configuración de agenda de un doctor.
   * Devuelve `null` en lugar de error cuando el backend responde 404
   * (el doctor todavía no tiene configuración guardada).
   */
  obtenerConfiguracion(doctorId: string): Observable<ConfiguracionAgendaResponse | null> {
    return this.http
      .get<ConfiguracionAgendaResponse>(`${this.apiUrl}/schedule-config/${doctorId}`)
      .pipe(
        catchError((error) => {
          if (error?.status === 404) {
            return of(null);
          }
          throw error;
        })
      );
  }

  /** Crea o actualiza (upsert) la configuración de agenda de un doctor. */
  guardarConfiguracion(
    request: ConfiguracionAgendaRequest
  ): Observable<ConfiguracionAgendaResponse> {
    return this.http.put<ConfiguracionAgendaResponse>(`${this.apiUrl}/schedule-config`, request);
  }
}
