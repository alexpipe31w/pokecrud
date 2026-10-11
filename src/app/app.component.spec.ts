import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { DatasetService } from './services/game/dataset.service';

describe('AppComponent', () => {
  const dataset = { load: vi.fn(() => Promise.resolve()) };

  beforeEach(async () => {
    dataset.load.mockClear();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), { provide: DatasetService, useValue: dataset }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('carga el dataset al arrancar', () => {
    TestBed.createComponent(AppComponent);
    expect(dataset.load).toHaveBeenCalledTimes(1);
  });
});
