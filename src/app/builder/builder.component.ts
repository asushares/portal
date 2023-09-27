// Author: Preston Lee

import { Component } from '@angular/core';
import { Bundle, CodeableConcept, Consent, Organization, Patient } from 'fhir/r5';

import { v4 as uuidv4 } from 'uuid';
import { FhirService } from '../fhir.service';
import { BaseComponent } from '../base/base.component';

@Component({
  selector: 'app-builder',
  templateUrl: './builder.component.html',
  styleUrls: ['./builder.component.scss']
})
export class BuilderComponent extends BaseComponent {



  consent: Consent = this.template();

  patientSearchText = '';
  patientList: Bundle<Patient> | null = null;
  patientSelected: Patient | null = null;
  patientSearching: boolean = false;

  organizationSearchText = '';
  organizationList: Bundle<Organization> | null = null;
  organizationSelected: Organization[] = [];
  organizationSearching: boolean = false;

  medicalInformation!: {
    domesticViolence: boolean,
    geneticInformation: boolean,
    mentalHealth: boolean,
    sexualAndReproductive: boolean,
    substanceUse: boolean
  };
  purpose!: { treatment: boolean, research: boolean, none: boolean };

  constructor(protected fhirService: FhirService) {
    super();
    this.reset();
  }

  template() {
    let c: Consent = {
      resourceType: 'Consent',
      status: 'draft',
      decision: 'permit',
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
        purpose:  [
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

  addPeriod() {
    // if (this.consent.provision) {
    this.consent.period = { start: Date.now().toString(), end: Date.now().toString() };
    // }
  }

  removePeriod() {
    delete this.consent.period;
  }
  reset() {
    this.consent = this.template();
    this.removeSubject();
    this.organizationList = null;
    this.organizationSelected = [];
    this.medicalInformation = {
      domesticViolence: true,
      geneticInformation: true,
      mentalHealth: true,
      sexualAndReproductive: true,
      substanceUse: false
    };
    this.purpose = { treatment: true, research: true, none: false };
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

  updateMedicalInformation() {
    // console.log(this.medicalInformation.domesticViolence);
    // this.consent.

  }

  updatePurpose() {

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
