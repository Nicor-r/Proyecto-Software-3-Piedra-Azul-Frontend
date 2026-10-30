import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Doctor {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Franja {
  hora: string;
  disponible: boolean;
}

export interface AgendarCitaRequest {
  medicoId: string;
  fecha: string;
  hora: string;
}

export interface Cita {
  id: number;
  pacienteId: string;
  medicoId: string;
  fecha: string;
  hora: string;
  estado: string;
  pacienteNombre: string;
  medicoNombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class CitasService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/citas`;

  obtenerDoctores(): Observable<Doctor[]> {
    const doctores$ = this.http.get<Doctor[]>(`${environment.apiUrl}/doctores`).pipe(
      catchError(() => of([]))
    );

    const terapistas$ = this.http.get<any[]>(`${environment.apiUrl}/terapistas`).pipe(
      catchError(() => of([]))
    );

    return forkJoin([doctores$, terapistas$]).pipe(
      map(([doctores, terapistas]) => {
        console.log('Médicos recibidos:', doctores);
        console.log('Terapistas recibidos:', terapistas);

        const terapistasMapeados: Doctor[] = terapistas.map(t => ({
          id: t.id,
          nombre: t.nombre,
          activo: true
        }));

        return [...doctores, ...terapistasMapeados];
      })
    );
  }

  obtenerFranjasDisponibles(medicoId: string, fecha: string): Observable<Franja[]> {
    const params = new HttpParams()
      .set('medicoId', medicoId)
      .set('fecha', fecha);

    return this.http.get<Franja[]>(`${this.apiUrl}/disponibles`, { params });
  }

  agendarCita(datos: AgendarCitaRequest): Observable<Cita> {
    // El token lo agrega el interceptor automáticamente
    return this.http.post<Cita>(`${this.apiUrl}/agendar`, datos);
  }

  obtenerMisCitas(): Observable<Cita[]> {
    return this.http.get<Cita[]>(`${this.apiUrl}/mis-citas`);
  }

  // 1. Consultar historial por cédula
  obtenerHistorialPaciente(cedula: string): Observable<Cita[]> {
    return this.http.get<Cita[]>(`${this.apiUrl}/paciente/${cedula}`);
  }

  // 2. Exportar CSV por fecha (el backend deduce el terapista del token)
  exportarCitasCSV(fecha: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/exportar?fecha=${fecha}`, {
      responseType: 'blob' // Fundamental para descargar archivos
    });
  }
}