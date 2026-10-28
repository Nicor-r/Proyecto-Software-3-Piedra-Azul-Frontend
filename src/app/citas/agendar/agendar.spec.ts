import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AgendarCita } from './agendar';
import { CitasService } from '../../core/services/citas';

describe('AgendarCita', () => {
  let component: AgendarCita;
  let fixture: ComponentFixture<AgendarCita>;

  beforeEach(async () => {
    const mockCitasService = {
      obtenerDoctores: () => of([
        { id: 'doc-1', nombre: 'Dra. Ana Martinez', activo: true },
        { id: 'doc-3', nombre: 'Dra. Inactiva', activo: false }
      ]),
      obtenerFranjasDisponibles: () => of([]),
      agendarCita: () => of({}),
    };

    await TestBed.configureTestingModule({
      imports: [AgendarCita],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: CitasService, useValue: mockCitasService }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgendarCita);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create and load active doctors', () => {
    expect(component).toBeTruthy();
    expect(component.medicos().length).toBe(1);
    expect(component.medicos()[0].id).toBe('doc-1');
  });
});
