import { Component } from '@angular/core';
import { CdsService } from '../cds/cds.service';
import { DataSharingCDSHookRequest } from '@asushares/core';

@Component({
  selector: 'app-sandbox',
  templateUrl: './sandbox.component.html',
  styleUrl: './sandbox.component.scss'
})
export class SandboxComponent {

  data: DataSharingCDSHookRequest = new DataSharingCDSHookRequest();
  bundleString: string;

  response: any = null;
  
  constructor(protected cdsService: CdsService) {
    // this.data.context.content 
    this.bundleString = JSON.stringify({
      "resourceType": "Bundle",
      "type": "collection",
      "total": 1,
      "entry": [
        {
          "resource": {
            "resourceType": "Observation",
            "id": "f204",
            "status": "final",
            "code": {
              "coding": [
                {
                  "system": "http://snomed.info/sct",
                  "code": "724713006",
                  "display": "Harmful use of ketamine (disorder)"
                }
              ]
            },
            "subject": {
              "reference": "Patient/2321"
            },
            "issued": "2013-04-04T14:34:00+01:00",
            "performer": [
              {
                "reference": "Practitioner/f202",
                "display": "Luigi Maas"
              }
            ],
            "valueBoolean": true
          }
        }]
    }, null, "\t")
  }

  hookUrl() {
    return this.cdsService.patientConsentConsultUrl();
  }

  submit() {
  }

}
