// Author: Preston Lee

import { Component } from '@angular/core';
import { Bundle, CodeableConcept, Consent, ConsentProvision, Organization, Patient } from 'fhir/r5';

import { v4 as uuidv4 } from 'uuid';
import { FhirService } from '../fhir.service';
import { BaseComponent } from '../base/base.component';
import { ToastService } from '../toast/toast.service';
import { ConsentService } from '../consent/consent.service';

@Component({
  selector: 'app-builder',
  templateUrl: './builder.component.html',
  styleUrls: ['./builder.component.scss']
})
export class BuilderComponent extends BaseComponent {

  mode: 'create' | 'update' = 'create';

  consent: Consent = this.template();

  patientSearchText = '';
  patientList: Bundle<Patient> | null = null;
  patientSelected: Patient | null = null;
  patientSearching: boolean = false;

  organizationSearchText = '';
  organizationList: Bundle<Organization> | null = null;
  organizationSelected: Organization[] = [];
  organizationSearching: boolean = false;

  medicalInformation = this.templateMedicalInformation();

  templateMedicalInformation() {
    let t: {
      [key: string]: {
        domesticViolence: {
          enabled: boolean,
          act_code: 'VIO'
        }, geneticInformation: {
          enabled: boolean,
          act_code: 'GEN'
        }, mentalHealth: {
          enabled: boolean,
          act_code: 'MENT'
        }, sexualAndReproductive: {
          enabled: boolean,
          act_code: 'SEX'
        }, substanceUse: {
          enabled: boolean,
          act_code: 'SUB'
        }
      }
    } = {};
    this.consent.provision?.forEach(p => {
      t[p.id!] = {
        domesticViolence: {
          enabled: true,
          act_code: 'VIO'
        }, geneticInformation: {
          enabled: true,
          act_code: 'GEN'
        }, mentalHealth: {
          enabled: true,
          act_code: 'MENT'
        }, sexualAndReproductive: {
          enabled: true,
          act_code: 'SEX'
        }, substanceUse: {
          enabled: false,
          act_code: 'SUB'
        }
      }
    });
    return t;
  }

  // purpose!: { treatment: boolean, research: boolean };
  purpose = this.templatePurpose();

  templatePurpose() {
    return {
      treatment: { enabled: true, act_code: 'T1' },
      research: { enabled: true, act_code: 'T2' }
    }
  }

  // medicalInformationMap = [
  //   { category: 'domesticViolence', act_code: 'VIO' },
  //   { category: 'geneticInformation', act_code: 'GEN' },
  //   { category: 'mentalHealth', act_code: 'MENT' },
  //   { category: 'sexualAndReproductive', act_code: 'SEX' },
  //   { category: 'substanceUse', act_code: 'SUB' }
  // ]

  constructor(protected fhirService: FhirService, protected consentService: ConsentService, protected toastService: ToastService) {
    super();
    this.reset();
  }

  save() {
    this.consentService.post(this.consent).subscribe({
      next: oo => {
        console.log(oo);
        this.toastService.showSuccessToast('Consent Created', 'Saved as consent id: ' + oo.id);
        
        this.consent = Object.assign({}, oo, this.consent);
        this.mode = 'update';
        console.log('MERGED: ' + JSON.stringify(this.consent, null, "\t"));
        
      }, error: error => {
        console.log(error);
        console.log(error.error);
        this.toastService.showErrorToast('Consent Creation Failed', 'The server refused to create the consent document.');
      }
    });
  }

  update() {
    this.consentService.put(this.consent).subscribe({
      next: oo => {
        console.log(oo);
        this.toastService.showSuccessToast('Consent Updated', 'Updated consent id: ' + oo.id);
        this.mode = 'update';
      },
      error: error => {
        console.log(error);
        console.log(error.error);
        this.toastService.showErrorToast('Consent Update Failed', 'The server refused to update the consent document.');
      }
    });
  }

  template() {
    let c: Consent = {
      resourceType: 'Consent',
      status: 'draft',
      decision: 'deny',
      category: [
        {
          id: uuidv4(),
          text: 'Privacy Consent',
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/consentscope",
              "code": "patient-privacy",
              "display": "Privacy Consent"
            }
          ]
        },
        {
          id: uuidv4(),
          text: 'LOINC Consent Document',
          "coding": [
            {
              "system": "http://loinc.org",
              "code": "59284-6",
              "display": 'Consent Document'
            }
          ]
        }
      ],
      grantor: [],
      controller: [],
      provision: [{
        id: uuidv4(),
        actor: [{
          reference: {
            reference: ''
          },
          role: {
            coding: [
              {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                "code": "IRCP"
              }
            ]
          }
        }],
        action: [{
          coding: [
            {
              "system": "http://terminology.hl7.org/CodeSystem/consentaction",
              "code": "access"
            }
          ]
        }],
        securityLabel: [],
        purpose: [
          {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActReason",
            "code": "TREAT",
            "display": "treatment"
          },
          {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActReason",
            "code": "ETREAT",
            "display": "Emergency Treatment"
          }
        ]
      }]
    };
    return c;
  }

  // templateMedicalInformation() {
  //   let medicalInformation = {
  //     domesticViolence: true,
  //     geneticInformation: true,
  //     mentalHealth: true,
  //     sexualAndReproductive: true,
  //     substanceUse: false
  //   };
  //   return this.medicalInformation;
  // }

  reset() {
    this.consent = this.template();
    this.mode = 'create';
    this.removeSubject();
    this.organizationList = null;
    this.organizationSelected = [];
    this.medicalInformation = this.templateMedicalInformation();
    this.purpose = this.templatePurpose();
    // this.toastService.showSuccessToast("Form Reset", "Go for it!");
    console.log('Reset complete.');
  }

  addPeriod() {
    // if (this.consent.provision) {
    this.consent.period = { start: Date.now().toString(), end: Date.now().toString() };
    // }
  }

  removePeriod() {
    delete this.consent.period;
  }

  patientSearch(text: string) {
    this.patientSearching = true;
    this.fhirService.patientSearch(this.patientSearchText).subscribe(b => {
      this.patientList = b;
      this.patientSearching = false;
    });
  }

  // addPatientSubject() {

  // }

  selectPatientSubject(p: Patient) {
    this.patientSelected = p;
    this.consent.subject = { reference: 'Patient/' + p.id, type: 'Patient' };
  }

  removeSubject() {
    this.consent.subject = undefined;
    this.patientSelected = null;
    this.patientSearchText = '';
  }

  organizationSearch(text: string) {
    this.organizationSearching = true;
    this.fhirService.organizationSearch(this.organizationSearchText).subscribe(b => {
      this.organizationList = b;
      this.organizationSearching = false;
    });
  }

  selectOrganization(o: Organization) {
    this.organizationSelected.push(o);
    this.consent.controller?.push({ type: 'Organization', reference: 'Organization/' + o.id });
  }

  removeOrganization(org: Organization) {
    if (this.consent.controller !== undefined) {
      for (let i = 0; i < this.consent.controller.length; i++) {
        if ('Organization/' + org.id == this.consent.controller[i].reference) {
          this.consent.controller.splice(i, 1);
        }
      }
      for (let i = 0; i < this.organizationSelected.length; i++) {
        if (org.id == this.organizationSelected[i].id) {
          this.organizationSelected.splice(i, 1);
        }
      }
    }
  }

  organizationForReference(ref: string): Organization | null {
    let org = null;
    this.organizationSelected.forEach(o => {
      if ('Organization/' + o.id == ref) {
        org = o;
      }
    });
    return org;
  }

  isSelectedOrganization(o: Organization): boolean {
    let selected = false;
    this.organizationSelected.forEach(n => {
      if (n.id == o.id) {
        selected = true;
      }
    });
    return selected;
  }

  prettyConsentJson() {
    return JSON.stringify(this.consent, null, "\t");
  }

  downloadConsentJsonFile() {
    // this.toastrService.success("JSON download started...", 'Downloading Document');
    // let doc = new YAML.Document(r);
    // console.log(doc.toString());

    // Download mechanism via: https://blog.logrocket.com/programmatic-file-downloads-in-the-browser-9a5186298d5c/
    const blob = new Blob([this.prettyConsentJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consent.json';
    a.click();
  }

  // medicalInformationEnabledFor(provision_id: string, category: string) {
  //   let enabled = false;
  //   // keyof type this.be
  //   this.medicalInformation[provision_id].forEach(n => {
  //     if (n.category == category) {
  //       enabled = n.enabled;
  //     }
  //   })
  //   return enabled;
  // }

  updateMedicalInformation(cp: ConsentProvision) {
    if (cp.id && cp.securityLabel) {
      Object.entries(this.medicalInformation[cp.id]).forEach(([k, n]) => {
        // let n = Object.v this.medicalInformation[cp.id!];

        if (n.enabled) {
          let found = false;
          cp.securityLabel?.forEach(sl => {
            if (n.act_code == sl.code) {
              found = true;
            }
          });
          if (!found) {
            cp.securityLabel?.push({ code: n.act_code, system: 'FIXME-ActCode', display: 'FIXME-' + n.act_code });
          }
        } else { // disabled
          let foundAt = -1;
          for (let i = 0; i < cp.securityLabel!.length; i++) {
            if (n.act_code == cp.securityLabel![i].code) {
              foundAt = i;
            }
            if (foundAt >= 0) {
              cp.securityLabel?.splice(foundAt, 1);
            }
          }
        }
      });
    }
  }

  updatePurpose(p: ConsentProvision) {

  }

  createCategory() {
    this.consent.category?.push({ id: uuidv4() });
  }

  deleteCategory(cc: CodeableConcept) {
    if (this.consent.category) {
      for (let i = 0; i < this.consent.category?.length; i++) {
        if (this.consent.category[i].id === cc.id) {
          this.consent.category.splice(i, 1);
        }
      }
    }
  }

}
