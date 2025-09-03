import { Component } from '@angular/core';
import { CdsService } from '../cds/cds.service';
// import { DataSharingCDSHookRequest } from '@asushares/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { DataSharingCDSHookRequest, DataSharingEngineContext } from '@asushares/core';
import { Bundle, FhirResource } from 'fhir/r5';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-sandbox',
  templateUrl: './sandbox.component.html',
  styleUrl: './sandbox.component.scss',
  imports: [FormsModule, NgIf]
})
export class SandboxComponent {
responseFormatted() {
return this.response ? JSON.stringify(this.response, null, "\t") : null;
return this.response;
}

  // data: DataSharingCDSHookRequest = new DataSharingCDSHookRequest();
  bundleString: string;

  response: any = null;

  labelConfidenceThreshold: number = 0.0;

  constructor(protected cdsService: CdsService,
    protected toastr: ToastrService
  ) {
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
    try {

      let bundle: Bundle<FhirResource> = JSON.parse(this.bundleString); // validate JSON      
      let data = new DataSharingCDSHookRequest();
      data.context = new DataSharingEngineContext();
      data.context.content = bundle;
      this.cdsService.patientConsentConsult(data, this.labelConfidenceThreshold.toString()).subscribe({
        next: (res) => {
          this.response = res;
        },
        error: (err) => {
          this.response = {
            error: true,
            message: this.cdsService.formatErrors(err.error)
          };
        }
      });
    } catch (error) {
      this.toastr.error('Request payload must parse to a valid JSON document!', 'Invalid JSON');
    }
  }

}
