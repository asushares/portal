// Author: Preston Lee

import { Component } from '@angular/core';
import { Bundle, Consent, Organization, Patient } from 'fhir/r5';

import * as YAML from 'yaml';

import { FhirService } from '../fhir.service';

@Component({
  selector: 'app-builder',
  templateUrl: './builder.component.html',
  styleUrls: ['./builder.component.scss']
})
export class BuilderComponent {


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
    this.reset();
  }

  template() {
    let c: Consent = {
      resourceType: 'Consent',
      status: 'draft',
      provision: [],
      decision: 'permit',
      category: [],
      grantor: [],
      controller: []
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

}
