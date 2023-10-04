// Author: Preston Lee

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Bundle, Consent, OperationOutcome, Organization, Patient } from 'fhir/r5';
import { BaseService } from './base/base.service';
import { BackendService } from './backend/backend.service';

export class FhirService extends BaseService {

    headers(){
        let headers: HttpHeaders = new HttpHeaders({'Content-Type' : 'application/json'});
        return headers;
    }
    organizationUrl() {
        return this.backendService.url + '/Organization';
    }

    organizationSearch(text: string) {
        return this.http.get<Bundle<Organization>>(this.organizationUrl() + '?phonetic=' + text);
    }

    patientUrl() {
        return this.backendService.url + '/Patient';
    }

    patientSearch(text: string) {
        return this.http.get<Bundle<Patient>>(this.patientUrl() + '?name:contains=' + text);
    }

}