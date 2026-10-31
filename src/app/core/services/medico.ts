import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/** Respuesta de GET /api/medico/perfil */
export interface MedicoPerfil {
  doctorId: string;
  nombre: string;
}

/** Una fila del historial (HU-5): fecha, hora, medico/terapista y estado. */
export interface CitaHistorial {
  fecha: string;   // aaaa-mm-dd
  hora: string;    // HH:mm:ss
  medicoId: string;
  medicoNombre: string;
  estado: string;  // PENDIENTE, CONFIRMADA, CANCELADA, COMPLETADA
}

/** Respuesta de GET /api/medico/historial (HU-5). */
export interface HistorialPaciente {
  cedula: string;
  nombrePaciente: string;
  total: number;
  citas: CitaHistorial[];
}

/** Una sugerencia del autocompletado (HU-5.1). */
export interface PacienteSugerencia {
  cedula: string;
  nombreCompleto: string;
}

/** Archivo CSV descargado (HU-4): nombre con el que se guarda y su contenido. */
export interface ArchivoDescargado {
  nombre: string;
  contenido: Blob;
}

/**
 * Comunicacion con los endpoints exclusivos del actor MEDICO (/api/medico/**).
 * El token lo agrega automaticamente el authInterceptor.
 */
@Injectable({
  providedIn: 'root'
})
export class MedicoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/medico`;

  obtenerPerfil(): Observable<MedicoPerfil> {
    return this.http.get<MedicoPerfil>(`${this.apiUrl}/perfil`);
  }

  consultarHistorial(cedula: string): Observable<HistorialPaciente> {
    const params = new HttpParams().set('cedula', cedula);
    return this.http.get<HistorialPaciente>(`${this.apiUrl}/historial`, { params });
  }

  sugerirPacientes(cedula: string): Observable<PacienteSugerencia[]> {
    const params = new HttpParams().set('cedula', cedula);
    return this.http.get<PacienteSugerencia[]>(`${this.apiUrl}/pacientes/sugerencias`, { params });
  }

  /**
   * Descarga el CSV de citas del medico en una fecha (HU-4), opcionalmente
   * filtrado por estado (HU-4.1). "TODOS" o vacio = no se envia el estado.
   */
  exportarCitas(fecha: string, estado?: string): Observable<ArchivoDescargado> {
    let params = new HttpParams().set('fecha', fecha);
    if (estado && estado !== 'TODOS') {
      params = params.set('estado', estado);
    }

    return this.http
      .get(`${this.apiUrl}/citas/exportar`, { params, responseType: 'blob', observe: 'response' })
      .pipe(
        map((respuesta) => ({
          nombre: this.extraerNombreArchivo(respuesta.headers.get('Content-Disposition'), fecha),
          contenido: respuesta.body ?? new Blob(),
        }))
      );
  }

  /** Lee el nombre del archivo de: attachment; filename="citas_..._2026-10-30.csv" */
  private extraerNombreArchivo(contentDisposition: string | null, fecha: string): string {
    const coincidencia = contentDisposition?.match(/filename="?([^";]+)"?/);
    return coincidencia ? coincidencia[1] : `citas_${fecha}.csv`;
  }
}