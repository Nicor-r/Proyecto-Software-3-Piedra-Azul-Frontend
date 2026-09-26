import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
}

@Injectable({
  providedIn: 'root'
})
export class CitasService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/citas`;

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
}