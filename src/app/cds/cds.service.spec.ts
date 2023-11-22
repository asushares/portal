import { TestBed } from '@angular/core/testing';

import { CdsService } from './cds.service';

describe('CdsService', () => {
  let service: CdsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CdsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
