import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamsPage } from './teams.page';

describe('TeamsPage', () => {
  let fixture: ComponentFixture<TeamsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TeamsPage);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
