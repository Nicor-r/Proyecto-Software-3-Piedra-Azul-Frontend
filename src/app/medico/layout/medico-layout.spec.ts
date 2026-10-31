import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MedicoLayout, calcularIniciales } from './medico-layout';
import { Auth } from '../../core/services/auth';
import { MedicoService } from '../../core/services/medico';

describe('MedicoLayout', () => {
  let logoutLlamado: boolean;
  let perfil$: ReturnType<MedicoService['obtenerPerfil']>;

  function crearComponente() {
    TestBed.configureTestingModule({
      imports: [MedicoLayout],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: { logout: () => (logoutLlamado = true) } },
        { provide: MedicoService, useValue: { obtenerPerfil: () => perfil$ } },
      ],
    });
    const fixture = TestBed.createComponent(MedicoLayout);
    fixture.detectChanges(); // ejecuta ngOnInit y pinta la plantilla
    return fixture;
  }

  beforeEach(() => {
    logoutLlamado = false;
    perfil$ = of({ doctorId: 'doc-4', nombre: 'Dra. Ibis González - Cardiología' });
  });

  it('muestra el nombre, la especialidad y las iniciales del medico', () => {
    const fixture = crearComponente();
    const texto: string = fixture.nativeElement.textContent;

    expect(texto).toContain('Dra. Ibis González');
    expect(texto).toContain('Cardiología');
    expect(fixture.componentInstance.iniciales()).toBe('IG');
  });

  it('si el perfil falla muestra "Médico" sin romperse', () => {
    perfil$ = throwError(() => new Error('403'));

    const fixture = crearComponente();

    expect(fixture.componentInstance.nombreCorto()).toBe('Médico');
  });

  it('cerrarSesion cierra la sesion y lleva al login', () => {
    const fixture = crearComponente();
    const router = TestBed.inject(Router);
    let rutaNavegada: unknown[] = [];
    router.navigate = ((comandos: unknown[]) => {
      rutaNavegada = comandos;
      return Promise.resolve(true);
    }) as Router['navigate'];

    fixture.componentInstance.cerrarSesion();

    expect(logoutLlamado).toBe(true);
    expect(rutaNavegada).toEqual(['/auth/login']);
  });

  it('calcularIniciales funciona con y sin titulo, y con texto vacio', () => {
    expect(calcularIniciales('Dra. Ibis González - Cardiología')).toBe('IG');
    expect(calcularIniciales('Dr. Rocha - Terapia Física')).toBe('R');
    expect(calcularIniciales('')).toBe('MD');
  });
});