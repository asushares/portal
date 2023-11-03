// Author: Preston Lee

import { Component, OnInit } from '@angular/core';
import { ConsentService } from '../consent/consent.service';
import { Bundle, BundleEntry, Consent } from 'fhir/r5';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-browser',
  templateUrl: './browser.component.html',
  styleUrls: ['./browser.component.scss']
})
export class BrowserComponent implements OnInit {

  displayCategories(be: BundleEntry<Consent>) {
    return be.resource?.category?.map(cc => { cc.text }).join(', ');
  }

  public bundle: Bundle<Consent> | null = null;

  constructor(protected consentService: ConsentService, protected toastService: ToastService) {
  }

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.consentService.index().subscribe(b => {
      this.bundle = b;
      // FIXME Remove these lines once real data is available on the server
      // this.bundle.entry = [];
      // this.bundle.entry.push({resource: BrowserComponent.CONSENT_1});
      console.log(this.bundle);

    })
  }

  formatBundle() {
    let json = JSON.stringify(this.bundle, null, "\t");
    console.log(json);
    return json;
  }

  removeConsent(consent: Consent) {
    let index = -1;
    if (this.bundle?.entry) {
      this.bundle?.entry?.forEach((n, i) => {
        if (consent.id == this.bundle!.entry![i].resource?.id) {
          index = i;
        }
      })
      if (index >= 0) {
        this.bundle!.entry!.splice(index, 1);
      }
    }

  }

  delete(consent: Consent) {
    this.consentService.delete(consent).subscribe({
      next: oo => {
        console.log(oo);
        this.removeConsent(consent);
        this.toastService.showSuccessToast('Consent Deleted', 'The consent has been deleted.');
      }, error: error => {
        console.log(error);
        console.log(error.error);
        this.toastService.showErrorToast('Consent Deletion Failed', 'The server refused to delete the consent document.');
      }
    });
  }


  // public static CONSENT_1: Consent = {
  //   "id": "consent-00001",
  //   "resourceType": "Consent",
  //   "status": "inactive",
  //   "category": [
  //     {
  //       "coding": [
  //         {
  //           "system": "http://terminology.hl7.org/CodeSystem/consentscope",
  //           "code": "patient-privacy"
  //         }
  //       ]
  //     },
  //     {
  //       "coding": [
  //         {
  //           "system": "http://loinc.org",
  //           "code": "59284-6"
  //         }
  //       ]
  //     }
  //   ],
  //   "subject" : {"reference" : "Patient/6a5abb13-ff67-9a06-244d-47116876bc27", "type": "Patient" },
  //   "grantor" : [{"reference" : "Patient/6a5abb13-ff67-9a06-244d-47116876bc27", "type": "Patient" }],
  //   "controller": [
  //     {
  //       "reference": "Organization/dc9baffe-b582-338f-9741-0c4b22004975"
  //     }
  //   ],
  //   "regulatoryBasis": [{
  //     "coding": [
  //       {
  //         "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
  //         "code": "hipaa-self-pay"
  //       }
  //     ]
  //   }],
  //   "decision" : "permit",
  //   "provision": [{
  //     "period": {
  //       "start": "2019-11-01",
  //       "end": "2029-01-01"
  //     },
  //     "provision": [
  //       {
  //         "actor": [
  //           {
  //             "role": {
  //               "coding": [
  //                 {
  //                   "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
  //                   "code": "IRCP"
  //                 }
  //               ]
  //             },
  //             "reference": {
  //               "reference": "Practitioner/5c38f2c3-953a-3f86-a753-bd7d081bd538"
  //             }
  //           }
  //         ],
  //         "action": [
  //           {
  //             "coding": [
  //               {
  //                 "system": "http://terminology.hl7.org/CodeSystem/consentaction",
  //                 "code": "access"
  //               }
  //             ]
  //           },
  //           {
  //             "coding": [
  //               {
  //                 "system": "http://terminology.hl7.org/CodeSystem/consentaction",
  //                 "code": "correct"
  //               }
  //             ]
  //           }
  //         ]
  //       }
  //     ]
  //   }],
  //   "identifier": [
  //     {
  //       "system": "http://sdhealthconnect.github.io/leap/samples/ids",
  //       "value": "consent-abraham-deny-practitioner"
  //     }
  //   ]
  // }


}
