import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { TerapistaService } from '../../../core/services/terapista';
import { calcularIniciales } from '../../../medico/layout/medico-layout';

@Component({
    selector: 'app-terapista-layout',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: './terapista-layout.html',
    styleUrl: './terapista-layout.css'
})
export class TerapistaLayout {
    private readonly router = inject(Router);
    private readonly auth = inject(Auth);
    readonly terapistaService = inject(TerapistaService);

    ngOnInit(): void {
        // Pide los datos al backend tan pronto como carga el panel
        this.terapistaService.cargarPerfil();
    }

    menu = [
        { etiqueta: 'Historial de pacientes', ruta: '/terapista/historial', icono: 'historial' },
        { etiqueta: 'Exportar citas', ruta: '/terapista/exportar', icono: 'exportar' },
        { etiqueta: 'Reportes', ruta: '/terapista/reportes', icono: 'reportes' }
    ];

    // NOTA: Como el token JWT solo guarda el email y el rol, 
    // usamos el email para mostrar algo en el panel.
    // Si tu servicio Auth tiene un método para obtener el nombre real, úsalo aquí.
    get nombreCorto() { return this.terapistaService.nombreReal(); }
    get especialidad() { return this.terapistaService.especialidadReal(); }

    get iniciales() {
        const nombre = this.nombreCorto;
        return calcularIniciales(this.nombreCorto);
    }

    cerrarSesion(): void {
        localStorage.removeItem('token');
        this.router.navigate(['/auth/login']);
    }

    private obtenerEmailDelToken(): string | null {
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.sub || null;
        } catch {
            return null;
        }
    }
}