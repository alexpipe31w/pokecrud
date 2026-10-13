import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { EncounterApiService } from './encounter-api.service';

describe('EncounterApiService', () => {
  let api: EncounterApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(EncounterApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('view pide el encuentro con el id codificado', async () => {
    const done = api.view('c1:99:0');
    http.expectOne(`${environment.serverUrl}/encounters/c1%3A99%3A0`).flush({ id: 'c1:99:0' });
    expect(await done).toEqual({ id: 'c1:99:0' });
  });
});
