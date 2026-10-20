import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CitasAgendador } from './citas-agendador';
import { AgendadorService } from '../../core/services/agendador';

describe('CitasAgendador', () => {
  let component: CitasAgendador;
  let fixture: ComponentFixture<CitasAgendador>;

  beforeEach(async () => {
    const mockService = {
      listarDoctores: () => of([]),
      listarCitas: () => of({ total: 0, citas: [] }),
    };

    await TestBed.configureTestingModule({
      imports: [CitasAgendador],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AgendadorService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CitasAgendador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe inicializar el formulario de filtros con valores por defecto', () => {
    expect(component.filtroForm.get('medicoId')?.value).toBe('');
    expect(component.filtroForm.get('fecha')?.value).toBe('');
    expect(component.filtroForm.get('estado')?.value).toBe('TODOS');
  });

  it('debe permitir buscar por médico sin necesidad de fecha', () => {
    component.filtroForm.patchValue({ medicoId: 'doc-1', fecha: '' });
    component.buscarCitas();
    expect(component.mensajeError()).toBe('');
  });
});
