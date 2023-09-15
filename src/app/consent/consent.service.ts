import { Injectable } from '@angular/core';
import { BaseService } from '../base/base.service';
import { Bundle, Patient } from 'fhir/r5';
import { Observable } from 'rxjs';
import { BackendService } from '../backend/backend.service';

@Injectable({
  providedIn: 'root'
})
export class ConsentService extends BaseService {

  public static CONSENT_PATH = '/Consent';

  // constructor(protected backendService: BackendService) { 
  //   super();
  // }

  url(): string {
    return this.backendService.url + ConsentService.CONSENT_PATH;
  }

  index(): Observable<Bundle<Patient>> {
    let b = this.http.get<Bundle<Patient>>(this.url(), { headers: this.headers() });
    return b;
  }
}
