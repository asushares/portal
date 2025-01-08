import { Injectable } from '@angular/core';
import { BaseService } from '../base/base.service';
import { Card, DataSharingCDSHookRequest, DataSharingEngineContext } from '@asushares/core';
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


  patientConsentConsult(data: DataSharingCDSHookRequest, threshold: string) {
    let headers = new HttpHeaders()
      .append(DataSharingEngineContext.HEADER_CDS_REDACTION_ENABLED, 'false')
      .append(DataSharingEngineContext.HEADER_CDS_CONFIDENCE_THRESHOLD, threshold);
    let res = this.http.post<Card>(this.patientConsentConsultUrl(), data, { headers: headers });
    return res;
  }

}
