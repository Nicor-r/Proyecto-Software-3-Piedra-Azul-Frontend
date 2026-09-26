import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Agendar } from './agendar';

describe('Agendar', () => {
  let component: Agendar;
  let fixture: ComponentFixture<Agendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Agendar],
    }).compileComponents();

    fixture = TestBed.createComponent(Agendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
