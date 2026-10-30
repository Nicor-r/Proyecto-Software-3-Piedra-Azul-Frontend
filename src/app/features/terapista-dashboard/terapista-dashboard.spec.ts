import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TerapistaDashboard } from './terapista-dashboard';

describe('TerapistaDashboard', () => {
  let component: TerapistaDashboard;
  let fixture: ComponentFixture<TerapistaDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerapistaDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(TerapistaDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
