import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConfiguracionAgenda {
  id: string | null;
  doctorId: string;
  ventanaAgendamiento: { semanas: number };
  diasAtencion: { dias: string[] };
  franjaHoraria: { horaInicio: string; horaFin: string };
  intervaloCitas: { minutos: number };
}

@Injectable({ providedIn: 'root' })
export class ConfiguracionAgendaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/configuracion-agenda`;

  getByDoctor(doctorId: string): Observable<ConfiguracionAgenda> {
    return this.http.get<ConfiguracionAgenda>(`${this.apiUrl}/doctor/${doctorId}`);
  }

  save(config: ConfiguracionAgenda): Observable<ConfiguracionAgenda> {
    return this.http.put<ConfiguracionAgenda>(this.apiUrl, config);
  }
}