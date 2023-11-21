// Author: Preston Lee

import { Component, OnInit } from '@angular/core';
import { ConsentService } from '../consent/consent.service';
import { Bundle, BundleEntry, Consent, Organization, Patient } from 'fhir/r5';
import { ToastService } from '../toast/toast.service';
import { PatientService } from '../patient.service';
import { OrganizationService } from '../organization.service';

@Component({
  selector: 'app-browser',
  templateUrl: './browser.component.html',
  styleUrls: ['./browser.component.scss']
})
export class BrowserComponent implements OnInit {

  nameFor(p: Patient): any {
    let name = '(None)';
    if (p.name && p.name.length > 0) {
      let tmp = [];
      if (p.name[0].given) {
        tmp.push(...p.name[0].given);
      }
      if (p.name[0].family) {
        tmp.push(p.name[0].family);
      }
      name = tmp.join(' ');
    }
    return name;
  }

  displayCategories(be: BundleEntry<Consent>) {
    return be.resource?.category?.map(cc => { cc.text }).join(', ');
  }

  public bundle: Bundle<Consent> | null = null;

  public patientSummaries: { [key: string]: Patient } = {};
  public organizationSummaries: { [key: string]: Organization } = {};

  constructor(protected consentService: ConsentService, protected patientService: PatientService, protected organizationService: OrganizationService, protected toastService: ToastService) {
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
      if (this.bundle.entry) {
        this.bundle.entry.forEach(e => {

          // Cache the names of the patients
          if (e.resource?.subject?.reference) {
            let ref = e.resource?.subject?.reference;
            if (ref.match('^Patient/')) {
              let id = ref.substring('Patient/'.length);
              this.patientService.summary(id).subscribe(p => {
                this.patientSummaries[ref] = p;
                // console.log('Patient summary returned: ');
                // console.log(p);
              });
            }
          }

          // Cache the names of the Organizations
          if (e.resource?.controller) {
            e.resource.controller.forEach(c => {
              let ref = c.reference;
              if (ref && ref.match('^Organization/')) {
                let id = ref.substring('Organization/'.length);
                this.organizationService.summary(id).subscribe(o => {
                  this.organizationSummaries[ref!] = o;
                  // console.log('Organization summary returned: ');
                  // console.log(o);
                });
              }
            });
          }
        });
      }
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

}
