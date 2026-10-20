import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DoctorItem {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface CitaAgendadorItem {
  id: number;
  pacienteId: string;
  medicoId: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm:ss
  estado: string; // CONFIRMADA, PENDIENTE, COMPLETADA, CANCELADA
  pacienteNombre?: string;
  medicoNombre?: string;
}

export interface ListadoCitasResponse {
  total: number;
  citas: CitaAgendadorItem[];
}

@Injectable({
  providedIn: 'root'
})
export class AgendadorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listarDoctores(): Observable<DoctorItem[]> {
    return this.http.get<DoctorItem[]>(`${this.apiUrl}/doctores`);
  }

  listarCitas(medicoId?: string, fecha?: string, estado?: string): Observable<ListadoCitasResponse> {
    let params = new HttpParams();
    if (medicoId && medicoId.trim() !== '') {
      params = params.set('medicoId', medicoId.trim());
    }
    if (fecha && fecha.trim() !== '') {
      params = params.set('fecha', fecha.trim());
    }
    if (estado && estado.trim() !== '' && estado !== 'TODOS') {
      params = params.set('estado', estado.trim());
    }

    return this.http.get<ListadoCitasResponse>(`${this.apiUrl}/citas`, { params });
  }
}
