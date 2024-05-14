import { Injectable } from '@angular/core';
import { BaseService } from '../base/base.service';
import { DataSharingCDSHookRequest } from '@asushares/core';

@Injectable()
export class CdsService extends BaseService {

  // constructor(protected backendService: BackendService, protected http: HttpClient) {
  //   super(backendService, http);
  // }

  patientConsentConsultUrl() {
    return this.backendService.cdsUrl + '/cds-services/patient-consent-consult';
  }

  patientConsentConsult(data: DataSharingCDSHookRequest) {
    let res = this.http.post(this.patientConsentConsultUrl(), data);
    return res;
  }

}
