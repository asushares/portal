import { Injectable } from '@angular/core';
import { BaseService } from '../base/base.service';
import { DataSharingCDSHookRequest, DataSharingEngineContext } from '@asushares/core';
import { Parameters, Patient } from 'fhir/r5';
import { HttpHeaders } from '@angular/common/http';

@Injectable()
export class CdsService extends BaseService {

  // constructor(protected backendService: BackendService, protected http: HttpClient) {
  //   super(backendService, http);
  // }

  patientConsentConsultUrl() {
    return this.backendService.cdsUrl + '/cds-services/patient-consent-consult';
  }


  patientConsentConsult(data: DataSharingCDSHookRequest) {
    let headers = new HttpHeaders().append(DataSharingEngineContext.HEADER_CDS_REDACTION_ENABLED, 'false');
    let res = this.http.post(this.patientConsentConsultUrl(), data, { headers: headers });
    return res;
  }

}
