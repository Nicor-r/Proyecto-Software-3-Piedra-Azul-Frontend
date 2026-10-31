import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TerapistaService {
  private readonly http = inject(HttpClient);
  
  // Signal para guardar el nombre y la especialidad globalmente
  nombreReal = signal('Terapista');
  especialidadReal = signal('Terapia Física');

  cargarPerfil() {
    this.http.get<{ nombre: string, especialidad: string }>(`${environment.apiUrl}/terapistas/perfil`)
      .subscribe({
        next: (perfil) => {
          this.nombreReal.set(perfil.nombre);
          this.especialidadReal.set(perfil.especialidad);
        }
      });
  }
}